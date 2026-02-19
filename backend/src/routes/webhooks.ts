import { Router, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types';
import { randomBytes, randomUUID } from 'crypto';

const router = Router();

router.use(authenticate as any);

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createWebhookSchema = z.object({
  url: z.string().url().max(2048),
  events: z.array(z.string().min(1).max(100)).min(1),
});

const updateWebhookSchema = z.object({
  url: z.string().url().max(2048).optional(),
  events: z.array(z.string().min(1).max(100)).min(1).optional(),
  is_active: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// GET / - List webhooks for tenant
// ---------------------------------------------------------------------------
router.get('/', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to list webhooks', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list webhooks' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('List webhooks error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list webhooks' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create webhook subscription
// ---------------------------------------------------------------------------
router.post('/', validate(createWebhookSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { url, events } = req.body;

    const secret = randomBytes(32).toString('hex');

    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .insert({
        tenant_id: tenantId,
        url,
        events,
        secret,
        is_active: true,
        failure_count: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create webhook', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create webhook' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Create webhook error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create webhook' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id - Update webhook
// ---------------------------------------------------------------------------
router.patch('/:id', validate(updateWebhookSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update webhook error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update webhook' },
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id - Delete webhook
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('webhooks')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      logger.error('Failed to delete webhook', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete webhook' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Webhook deleted', id } });
  } catch (err) {
    logger.error('Delete webhook error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete webhook' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id/deliveries - List webhook deliveries with pagination
// ---------------------------------------------------------------------------
router.get('/:id/deliveries', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;
    const { page, limit, offset } = parsePaginationParams(req.query);

    // Verify webhook belongs to tenant
    const { data: webhook } = await supabaseAdmin
      .from('webhooks')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!webhook) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook not found' },
      });
      return;
    }

    const { data, error, count } = await supabaseAdmin
      .from('webhook_deliveries')
      .select('*', { count: 'exact' })
      .eq('webhook_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to list webhook deliveries', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list webhook deliveries' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('List webhook deliveries error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list webhook deliveries' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/test - Send test webhook delivery
// ---------------------------------------------------------------------------
router.post('/:id/test', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    // Verify webhook belongs to tenant
    const { data: webhook } = await supabaseAdmin
      .from('webhooks')
      .select('id, url')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!webhook) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook not found' },
      });
      return;
    }

    // Create a test delivery record
    const now = new Date().toISOString();
    const { data: delivery, error } = await supabaseAdmin
      .from('webhook_deliveries')
      .insert({
        webhook_id: id,
        event: 'test',
        payload: { test: true },
        response_status: 200,
        response_body: '{"ok":true}',
        duration_ms: 0,
        status: 'success',
        attempts: 1,
        created_at: now,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create test webhook delivery', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to send test webhook' },
      });
      return;
    }

    // Update last_triggered_at on the webhook
    await supabaseAdmin
      .from('webhooks')
      .update({ last_triggered_at: now, updated_at: now })
      .eq('id', id);

    res.status(201).json({ success: true, data: delivery });
  } catch (err) {
    logger.error('Test webhook error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send test webhook' },
    });
  }
});

export default router;
