import { Router, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';
import { validate } from '../middleware/validate';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination';
import { logger } from '../utils/logger';
import { AuditService } from '../services/audit.service';
import type { AuthenticatedRequest } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// Audit all write operations on tenant routes
router.use(auditLog);

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  logo_url: z.string().url().nullable().optional(),
  siret: z.string().max(20).nullable().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
    })
    .nullable()
    .optional(),
  phone: z.string().max(20).nullable().optional(),
});

const moduleToggleSchema = z.object({
  module_id: z.string().uuid(),
  is_active: z.boolean(),
});

// ---------------------------------------------------------------------------
// GET / - List tenants (super_admin only)
// ---------------------------------------------------------------------------
router.get('/', requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query);

    const { data, error, count } = await supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to list tenants', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list tenants' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('List tenants error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list tenants' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id - Get tenant details
// ---------------------------------------------------------------------------
router.get('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    // Non-super_admins can only view their own tenant
    if (authReq.user.role !== 'super_admin' && authReq.tenant.id !== id) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot access other tenants' },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Get tenant error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get tenant' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id - Update tenant
// ---------------------------------------------------------------------------
router.patch('/:id', requireRole('admin', 'super_admin'), validate(updateTenantSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    // Non-super_admins can only update their own tenant
    if (authReq.user.role !== 'super_admin' && authReq.tenant.id !== id) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot update other tenants' },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update tenant error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update tenant' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id/stats - Tenant usage stats
// ---------------------------------------------------------------------------
router.get('/:id/stats', requireRole('admin', 'super_admin'), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    if (authReq.user.role !== 'super_admin' && authReq.tenant.id !== id) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot access other tenant stats' },
      });
      return;
    }

    const [usersResult, contactsResult, ordersResult, dealsResult] = await Promise.all([
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', id).eq('is_active', true),
      supabaseAdmin.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
      supabaseAdmin.from('deals').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    ]);

    // Get tenant for current_usage
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('current_usage, plan, monthly_credits')
      .eq('id', id)
      .single();

    res.json({
      success: true,
      data: {
        users_count: usersResult.count || 0,
        contacts_count: contactsResult.count || 0,
        orders_count: ordersResult.count || 0,
        deals_count: dealsResult.count || 0,
        plan: tenant?.plan,
        monthly_credits: tenant?.monthly_credits,
        current_usage: tenant?.current_usage || {},
      },
    });
  } catch (err) {
    logger.error('Tenant stats error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get tenant stats' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/modules - Enable/disable module
// ---------------------------------------------------------------------------
router.post('/:id/modules', requireRole('admin', 'super_admin'), validate(moduleToggleSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { module_id, is_active } = req.body;

    if (authReq.user.role !== 'super_admin' && authReq.tenant.id !== id) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot modify other tenant modules' },
      });
      return;
    }

    // Check if module exists
    const { data: moduleData, error: moduleError } = await supabaseAdmin
      .from('modules')
      .select('*')
      .eq('id', module_id)
      .single();

    if (moduleError || !moduleData) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Module not found' },
      });
      return;
    }

    // Upsert tenant_module
    const { data: existing } = await supabaseAdmin
      .from('tenant_modules')
      .select('id')
      .eq('tenant_id', id)
      .eq('module_id', module_id)
      .single();

    let data;
    if (existing) {
      const result = await supabaseAdmin
        .from('tenant_modules')
        .update({
          is_active,
          ...(is_active ? { activated_at: new Date().toISOString() } : { deactivated_at: new Date().toISOString() }),
        })
        .eq('id', existing.id)
        .select()
        .single();
      data = result.data;
    } else {
      const result = await supabaseAdmin
        .from('tenant_modules')
        .insert({
          tenant_id: id,
          module_id,
          is_active,
          activated_at: new Date().toISOString(),
        })
        .select()
        .single();
      data = result.data;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Toggle module error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle module' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id/audit-logs - Get audit logs for a tenant (admin only)
// ---------------------------------------------------------------------------
router.get('/:id/audit-logs', requireRole('admin', 'super_admin'), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    // Non-super_admins can only view their own tenant's audit logs
    if (authReq.user.role !== 'super_admin' && authReq.tenant.id !== id) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot access other tenant audit logs' },
      });
      return;
    }

    const { page, limit } = parsePaginationParams(req.query);

    const result = await AuditService.getLogs(id, {
      user_id: req.query.user_id as string | undefined,
      action: req.query.action as string | undefined,
      resource_type: req.query.resource_type as string | undefined,
      resource_id: req.query.resource_id as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      page,
      limit,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: buildPaginationMeta(page, limit, result.total),
    });
  } catch (err) {
    logger.error('Get audit logs error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit logs' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id/activity-summary - Get 24h activity summary (admin only)
// ---------------------------------------------------------------------------
router.get('/:id/activity-summary', requireRole('admin', 'super_admin'), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    if (authReq.user.role !== 'super_admin' && authReq.tenant.id !== id) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot access other tenant activity' },
      });
      return;
    }

    const summary = await AuditService.getActivitySummary(id);

    res.json({ success: true, data: summary });
  } catch (err) {
    logger.error('Get activity summary error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get activity summary' },
    });
  }
});

export default router;
