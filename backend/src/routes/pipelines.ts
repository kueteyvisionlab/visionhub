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

const stageSchema = z.object({
  name: z.string().min(1).max(255),
  probability: z.number().min(0).max(100),
  color: z.string().min(1).max(50),
});

const createPipelineSchema = z.object({
  name: z.string().min(1).max(255),
  stages: z.array(stageSchema).min(1),
});

const updatePipelineSchema = z.object({
  name: z.string().min(1).max(255),
});

const addStageSchema = z.object({
  name: z.string().min(1).max(255),
  probability: z.number().min(0).max(100),
  color: z.string().min(1).max(50),
  display_order: z.number().int().min(0),
});

const updateStageSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  probability: z.number().min(0).max(100).optional(),
  color: z.string().min(1).max(50).optional(),
  display_order: z.number().int().min(0).optional(),
});

// ---------------------------------------------------------------------------
// GET / - List pipelines for tenant
// ---------------------------------------------------------------------------
router.get('/', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const { data, error } = await supabaseAdmin
      .from('pipelines')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to list pipelines', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list pipelines' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('List pipelines error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list pipelines' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create pipeline with stages
// ---------------------------------------------------------------------------
router.post('/', validate(createPipelineSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { name, stages } = req.body;

    // Insert pipeline
    const { data: pipeline, error: pipelineError } = await supabaseAdmin
      .from('pipelines')
      .insert({
        tenant_id: tenantId,
        name,
      })
      .select()
      .single();

    if (pipelineError || !pipeline) {
      logger.error('Failed to create pipeline', { error: pipelineError?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create pipeline' },
      });
      return;
    }

    // Insert stages with display_order
    const stageRows = stages.map((stage: z.infer<typeof stageSchema>, index: number) => ({
      pipeline_id: pipeline.id,
      name: stage.name,
      probability: stage.probability,
      color: stage.color,
      display_order: index,
    }));

    const { data: insertedStages, error: stagesError } = await supabaseAdmin
      .from('pipeline_stages')
      .insert(stageRows)
      .select();

    if (stagesError) {
      logger.error('Failed to create pipeline stages', { error: stagesError.message });
      // Clean up the pipeline
      await supabaseAdmin.from('pipelines').delete().eq('id', pipeline.id);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create pipeline stages' },
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: { ...pipeline, stages: insertedStages },
    });
  } catch (err) {
    logger.error('Create pipeline error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create pipeline' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id - Get pipeline with stages
// ---------------------------------------------------------------------------
router.get('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data: pipeline, error } = await supabaseAdmin
      .from('pipelines')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !pipeline) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pipeline not found' },
      });
      return;
    }

    // Get stages ordered by display_order
    const { data: stages } = await supabaseAdmin
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', id)
      .order('display_order', { ascending: true });

    res.json({
      success: true,
      data: { ...pipeline, stages: stages || [] },
    });
  } catch (err) {
    logger.error('Get pipeline error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get pipeline' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id - Update pipeline name
// ---------------------------------------------------------------------------
router.patch('/:id', validate(updatePipelineSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('pipelines')
      .update({ name: req.body.name, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pipeline not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update pipeline error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update pipeline' },
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id - Delete pipeline (CASCADE deletes stages)
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('pipelines')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pipeline not found' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Pipeline deleted', id } });
  } catch (err) {
    logger.error('Delete pipeline error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete pipeline' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/stages - Add a stage to pipeline
// ---------------------------------------------------------------------------
router.post('/:id/stages', validate(addStageSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;
    const { name, probability, color, display_order } = req.body;

    // Verify pipeline belongs to tenant
    const { data: pipeline } = await supabaseAdmin
      .from('pipelines')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!pipeline) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pipeline not found' },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('pipeline_stages')
      .insert({
        pipeline_id: id,
        name,
        probability,
        color,
        display_order,
      })
      .select()
      .single();

    if (error || !data) {
      logger.error('Failed to add stage', { error: error?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to add stage' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Add stage error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to add stage' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /stages/:stageId - Update stage
// ---------------------------------------------------------------------------
router.patch('/stages/:stageId', validate(updateStageSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { stageId } = req.params;

    // Verify stage belongs to a pipeline owned by this tenant
    const { data: stage } = await supabaseAdmin
      .from('pipeline_stages')
      .select('id, pipeline_id, pipelines!inner(tenant_id)')
      .eq('id', stageId)
      .eq('pipelines.tenant_id', tenantId)
      .single();

    if (!stage) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stage not found' },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('pipeline_stages')
      .update(req.body)
      .eq('id', stageId)
      .select()
      .single();

    if (error || !data) {
      logger.error('Failed to update stage', { error: error?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update stage' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update stage error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update stage' },
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /stages/:stageId - Delete stage
// ---------------------------------------------------------------------------
router.delete('/stages/:stageId', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { stageId } = req.params;

    // Verify stage belongs to a pipeline owned by this tenant
    const { data: stage } = await supabaseAdmin
      .from('pipeline_stages')
      .select('id, pipeline_id, pipelines!inner(tenant_id)')
      .eq('id', stageId)
      .eq('pipelines.tenant_id', tenantId)
      .single();

    if (!stage) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stage not found' },
      });
      return;
    }

    const { error } = await supabaseAdmin
      .from('pipeline_stages')
      .delete()
      .eq('id', stageId);

    if (error) {
      logger.error('Failed to delete stage', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete stage' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Stage deleted', id: stageId } });
  } catch (err) {
    logger.error('Delete stage error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete stage' },
    });
  }
});

export default router;
