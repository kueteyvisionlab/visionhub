import { Router, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.use(authenticate as any);

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createReportSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(100),
  config: z.record(z.unknown()),
});

const scheduleReportSchema = z.object({
  report_id: z.string().uuid(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  recipients: z.array(z.string().email()).min(1),
});

// ---------------------------------------------------------------------------
// GET / - List saved reports for tenant
// ---------------------------------------------------------------------------
router.get('/', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { page, limit, offset } = parsePaginationParams(req.query);

    const { data, error, count } = await supabaseAdmin
      .from('saved_reports')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to list reports', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list reports' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('List reports error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list reports' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create saved report
// ---------------------------------------------------------------------------
router.post('/', validate(createReportSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { name, type, config } = req.body;

    const { data, error } = await supabaseAdmin
      .from('saved_reports')
      .insert({
        tenant_id: tenantId,
        user_id: authReq.user.id,
        name,
        report_type: type,
        config,
        is_shared: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create report', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create report' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Create report error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create report' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id - Get report by id
// ---------------------------------------------------------------------------
router.get('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('saved_reports')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Get report error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get report' },
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id - Delete report
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    // Also delete any scheduled reports tied to this report
    await supabaseAdmin
      .from('scheduled_reports')
      .delete()
      .eq('report_id', id)
      .eq('tenant_id', tenantId);

    const { error } = await supabaseAdmin
      .from('saved_reports')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      logger.error('Failed to delete report', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete report' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Report deleted', id } });
  } catch (err) {
    logger.error('Delete report error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete report' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /schedule - Create scheduled report
// ---------------------------------------------------------------------------
router.post('/schedule', validate(scheduleReportSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { report_id, frequency, recipients } = req.body;

    // Verify the report belongs to this tenant
    const { data: report } = await supabaseAdmin
      .from('saved_reports')
      .select('id')
      .eq('id', report_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!report) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report not found in this tenant' },
      });
      return;
    }

    // Calculate next_send_at based on frequency
    const now = new Date();
    let nextSendAt: Date;

    switch (frequency) {
      case 'daily':
        nextSendAt = new Date(now);
        nextSendAt.setDate(nextSendAt.getDate() + 1);
        nextSendAt.setHours(8, 0, 0, 0); // 08:00 next day
        break;
      case 'weekly':
        nextSendAt = new Date(now);
        nextSendAt.setDate(nextSendAt.getDate() + (7 - nextSendAt.getDay() + 1)); // next Monday
        nextSendAt.setHours(8, 0, 0, 0);
        break;
      case 'monthly':
        nextSendAt = new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0, 0); // 1st of next month
        break;
      default:
        nextSendAt = new Date(now);
        nextSendAt.setDate(nextSendAt.getDate() + 1);
        nextSendAt.setHours(8, 0, 0, 0);
    }

    const { data, error } = await supabaseAdmin
      .from('scheduled_reports')
      .insert({
        report_id,
        tenant_id: tenantId,
        frequency,
        recipients,
        next_send_at: nextSendAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to schedule report', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to schedule report' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Schedule report error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to schedule report' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /scheduled - List scheduled reports
// ---------------------------------------------------------------------------
router.get('/scheduled', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const { data, error } = await supabaseAdmin
      .from('scheduled_reports')
      .select('*, report:saved_reports(id, name, report_type)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to list scheduled reports', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list scheduled reports' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('List scheduled reports error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list scheduled reports' },
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /scheduled/:id - Delete scheduled report
// ---------------------------------------------------------------------------
router.delete('/scheduled/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('scheduled_reports')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      logger.error('Failed to delete scheduled report', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete scheduled report' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Scheduled report deleted', id } });
  } catch (err) {
    logger.error('Delete scheduled report error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete scheduled report' },
    });
  }
});

export default router;
