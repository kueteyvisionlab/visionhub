import { Router, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.use(authenticate as any);

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createDealSchema = z.object({
  name: z.string().min(1).max(255),
  pipeline_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  amount: z.number().min(0),
  owner_user_id: z.string().uuid(),
  expected_close_date: z.string().datetime().nullable().optional(),
  order_id: z.string().uuid().nullable().optional(),
});

const updateDealSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  pipeline_id: z.string().uuid().optional(),
  stage_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  amount: z.number().min(0).optional(),
  owner_user_id: z.string().uuid().optional(),
  expected_close_date: z.string().datetime().nullable().optional(),
  order_id: z.string().uuid().nullable().optional(),
  status: z.enum(['open', 'won', 'lost']).optional(),
  lost_reason: z.string().nullable().optional(),
});

const moveDealStageSchema = z.object({
  stage_id: z.string().uuid(),
});

const addActivitySchema = z.object({
  activity_type: z.string().min(1).max(100),
  description: z.string().min(1),
  metadata: z.record(z.unknown()).nullable().optional(),
});

// ---------------------------------------------------------------------------
// GET / - List deals with filters and pagination
// ---------------------------------------------------------------------------
router.get('/', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { page, limit, offset } = parsePaginationParams(req.query);

    const pipelineId = req.query.pipeline_id as string | undefined;
    const stageId = req.query.stage_id as string | undefined;
    const ownerUserId = req.query.owner_user_id as string | undefined;
    const status = req.query.status as string | undefined;
    const minScore = req.query.min_score as string | undefined;
    const maxScore = req.query.max_score as string | undefined;

    let query = supabaseAdmin
      .from('deals')
      .select(
        '*, contact:contacts(first_name, last_name), stage:pipeline_stages(name, probability)',
        { count: 'exact' },
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (pipelineId) query = query.eq('pipeline_id', pipelineId);
    if (stageId) query = query.eq('stage_id', stageId);
    if (ownerUserId) query = query.eq('owner_user_id', ownerUserId);
    if (status) query = query.eq('status', status);
    if (minScore) query = query.gte('score', Number(minScore));
    if (maxScore) query = query.lte('score', Number(maxScore));

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to list deals', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list deals' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('List deals error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list deals' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /forecast - Revenue forecast
// ---------------------------------------------------------------------------
router.get('/forecast', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    // Fetch all open deals with their stage probability and pipeline info
    const { data: deals, error } = await supabaseAdmin
      .from('deals')
      .select('id, amount, pipeline_id, stage:pipeline_stages(probability), pipeline:pipelines(id, name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'open');

    if (error) {
      logger.error('Failed to compute forecast', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to compute forecast' },
      });
      return;
    }

    // Group by pipeline
    const pipelineMap: Record<
      string,
      { pipeline_id: string; pipeline_name: string; total_pipeline: number; weighted_pipeline: number; deal_count: number }
    > = {};

    let globalTotal = 0;
    let globalWeighted = 0;

    for (const deal of deals || []) {
      const pipelineId = deal.pipeline_id;
      const pipelineName = (deal.pipeline as any)?.name || 'Unknown';
      const amount = deal.amount || 0;
      const probability = (deal.stage as any)?.probability || 0;
      const weighted = amount * probability / 100;

      if (!pipelineMap[pipelineId]) {
        pipelineMap[pipelineId] = {
          pipeline_id: pipelineId,
          pipeline_name: pipelineName,
          total_pipeline: 0,
          weighted_pipeline: 0,
          deal_count: 0,
        };
      }

      pipelineMap[pipelineId].total_pipeline += amount;
      pipelineMap[pipelineId].weighted_pipeline += weighted;
      pipelineMap[pipelineId].deal_count += 1;

      globalTotal += amount;
      globalWeighted += weighted;
    }

    res.json({
      success: true,
      data: {
        total_pipeline: globalTotal,
        weighted_pipeline: globalWeighted,
        deal_count: (deals || []).length,
        by_pipeline: Object.values(pipelineMap),
      },
    });
  } catch (err) {
    logger.error('Forecast error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to compute forecast' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create deal
// ---------------------------------------------------------------------------
router.post('/', validate(createDealSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { name, pipeline_id, stage_id, contact_id, amount, owner_user_id, expected_close_date, order_id } = req.body;

    // Verify contact belongs to tenant
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('id', contact_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!contact) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Contact not found in this tenant' },
      });
      return;
    }

    // Verify pipeline belongs to tenant
    const { data: pipeline } = await supabaseAdmin
      .from('pipelines')
      .select('id')
      .eq('id', pipeline_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!pipeline) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Pipeline not found in this tenant' },
      });
      return;
    }

    // Verify stage belongs to the pipeline
    const { data: stage } = await supabaseAdmin
      .from('pipeline_stages')
      .select('id, probability')
      .eq('id', stage_id)
      .eq('pipeline_id', pipeline_id)
      .single();

    if (!stage) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Stage not found in this pipeline' },
      });
      return;
    }

    // Insert deal
    const { data: deal, error: dealError } = await supabaseAdmin
      .from('deals')
      .insert({
        tenant_id: tenantId,
        name,
        pipeline_id,
        stage_id,
        contact_id,
        amount,
        owner_user_id,
        expected_close_date: expected_close_date || null,
        order_id: order_id || null,
        status: 'open',
        probability: stage.probability,
      })
      .select()
      .single();

    if (dealError || !deal) {
      logger.error('Failed to create deal', { error: dealError?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create deal' },
      });
      return;
    }

    // Create initial activity
    await supabaseAdmin
      .from('deal_activities')
      .insert({
        deal_id: deal.id,
        user_id: authReq.user.id,
        activity_type: 'deal_created',
        description: 'Deal created',
      });

    res.status(201).json({ success: true, data: deal });
  } catch (err) {
    logger.error('Create deal error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create deal' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id - Get deal with activities, contact, and stage info
// ---------------------------------------------------------------------------
router.get('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data: deal, error } = await supabaseAdmin
      .from('deals')
      .select('*, contact:contacts(id, first_name, last_name, email, phone, company_name), stage:pipeline_stages(id, name, probability, color)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !deal) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Deal not found' },
      });
      return;
    }

    // Get last 20 activities
    const { data: activities } = await supabaseAdmin
      .from('deal_activities')
      .select('*')
      .eq('deal_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    res.json({
      success: true,
      data: { ...deal, activities: activities || [] },
    });
  } catch (err) {
    logger.error('Get deal error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get deal' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id - Update deal fields
// ---------------------------------------------------------------------------
router.patch('/:id', validate(updateDealSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('deals')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Deal not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update deal error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update deal' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id/stage - Move deal to new stage
// ---------------------------------------------------------------------------
router.patch('/:id/stage', validate(moveDealStageSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;
    const { stage_id: newStageId } = req.body;

    // Get current deal with stage info
    const { data: deal } = await supabaseAdmin
      .from('deals')
      .select('*, stage:pipeline_stages(id, name, probability)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!deal) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Deal not found' },
      });
      return;
    }

    // Get new stage info (must belong to the same pipeline)
    const { data: newStage } = await supabaseAdmin
      .from('pipeline_stages')
      .select('id, name, probability, is_won, is_lost')
      .eq('id', newStageId)
      .eq('pipeline_id', deal.pipeline_id)
      .single();

    if (!newStage) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Stage not found in this pipeline' },
      });
      return;
    }

    const oldStageName = (deal.stage as any)?.name || 'Unknown';
    const newStageName = newStage.name;

    // Determine new status based on stage flags
    let newStatus = deal.status;
    if (newStage.is_won) {
      newStatus = 'won';
    } else if (newStage.is_lost) {
      newStatus = 'lost';
    }

    // Update deal
    const { data: updatedDeal, error } = await supabaseAdmin
      .from('deals')
      .update({
        stage_id: newStageId,
        probability: newStage.probability,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !updatedDeal) {
      logger.error('Failed to move deal stage', { error: error?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to move deal stage' },
      });
      return;
    }

    // Create activity for stage change
    await supabaseAdmin
      .from('deal_activities')
      .insert({
        deal_id: id,
        user_id: authReq.user.id,
        activity_type: 'stage_changed',
        description: `Stage changed from ${oldStageName} to ${newStageName}`,
      });

    res.json({ success: true, data: updatedDeal });
  } catch (err) {
    logger.error('Move deal stage error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to move deal stage' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/activities - Add activity to deal
// ---------------------------------------------------------------------------
router.post('/:id/activities', validate(addActivitySchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;
    const { activity_type, description, metadata } = req.body;

    // Verify deal belongs to tenant
    const { data: deal } = await supabaseAdmin
      .from('deals')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!deal) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Deal not found' },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('deal_activities')
      .insert({
        deal_id: id,
        user_id: authReq.user.id,
        activity_type,
        description,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error || !data) {
      logger.error('Failed to add activity', { error: error?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to add activity' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Add activity error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to add activity' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id/score - Get deal score breakdown
// ---------------------------------------------------------------------------
router.get('/:id/score', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data: deal, error } = await supabaseAdmin
      .from('deals')
      .select('id, name, score, score_breakdown')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !deal) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Deal not found' },
      });
      return;
    }

    res.json({ success: true, data: deal });
  } catch (err) {
    logger.error('Get deal score error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get deal score' },
    });
  }
});

export default router;
