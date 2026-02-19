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

const serviceOrderStatuses = ['draft', 'scheduled', 'in_progress', 'completed', 'billed', 'cancelled'] as const;

const createServiceOrderSchema = z.object({
  order_id: z.string().uuid().nullable().optional(),
  entity_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  order_type: z.string().min(1).max(100),
  status: z.enum(serviceOrderStatuses).default('draft'),
  assigned_user_id: z.string().uuid().nullable().optional(),
  scheduled_start: z.string().datetime().nullable().optional(),
  scheduled_end: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
});

const updateServiceOrderSchema = createServiceOrderSchema.partial();

const updateStatusSchema = z.object({
  status: z.enum(serviceOrderStatuses),
});

const assignSchema = z.object({
  user_id: z.string().uuid(),
});

// Valid status transitions
const statusTransitions: Record<string, string[]> = {
  draft: ['scheduled', 'cancelled'],
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['billed'],
  billed: [],
  cancelled: ['draft'],
};

// ---------------------------------------------------------------------------
// GET / - List service orders
// ---------------------------------------------------------------------------
router.get('/', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { page, limit, offset } = parsePaginationParams(req.query);

    const status = req.query.status as string | undefined;
    const assignedUserId = req.query.assigned_user_id as string | undefined;
    const contactId = req.query.contact_id as string | undefined;
    const entityId = req.query.entity_id as string | undefined;

    let query = supabaseAdmin
      .from('service_orders')
      .select('*, contact:contacts(id, first_name, last_name), entity:entities(id, name, entity_type), assigned_user:users(id, full_name)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (assignedUserId) query = query.eq('assigned_user_id', assignedUserId);
    if (contactId) query = query.eq('contact_id', contactId);
    if (entityId) query = query.eq('entity_id', entityId);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to list service orders', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list service orders' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('List service orders error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list service orders' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create service order
// ---------------------------------------------------------------------------
router.post('/', validate(createServiceOrderSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    // Verify contact and entity belong to tenant
    const [contactCheck, entityCheck] = await Promise.all([
      supabaseAdmin.from('contacts').select('id').eq('id', req.body.contact_id).eq('tenant_id', tenantId).single(),
      supabaseAdmin.from('entities').select('id').eq('id', req.body.entity_id).eq('tenant_id', tenantId).single(),
    ]);

    if (!contactCheck.data) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Contact not found in this tenant' },
      });
      return;
    }

    if (!entityCheck.data) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Entity not found in this tenant' },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('service_orders')
      .insert({
        ...req.body,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create service order', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create service order' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Create service order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create service order' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /calendar - Calendar view
// ---------------------------------------------------------------------------
router.get('/calendar', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const assignedUserId = req.query.assigned_user_id as string | undefined;

    let query = supabaseAdmin
      .from('service_orders')
      .select('id, order_type, status, scheduled_start, scheduled_end, notes, contact:contacts(id, first_name, last_name), entity:entities(id, name), assigned_user:users(id, full_name)')
      .eq('tenant_id', tenantId)
      .not('scheduled_start', 'is', null);

    if (start) query = query.gte('scheduled_start', start);
    if (end) query = query.lte('scheduled_end', end);
    if (assignedUserId) query = query.eq('assigned_user_id', assignedUserId);

    const { data, error } = await query.order('scheduled_start', { ascending: true });

    if (error) {
      logger.error('Failed to get calendar events', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get calendar events' },
      });
      return;
    }

    // Map to calendar event format
    const events = (data || []).map((so) => ({
      id: so.id,
      title: `${so.order_type} - ${(so as any).contact?.first_name} ${(so as any).contact?.last_name}`,
      start: so.scheduled_start,
      end: so.scheduled_end,
      status: so.status,
      order_type: so.order_type,
      contact: (so as any).contact,
      entity: (so as any).entity,
      assigned_user: (so as any).assigned_user,
    }));

    res.json({ success: true, data: events });
  } catch (err) {
    logger.error('Calendar error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get calendar' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id - Get service order
// ---------------------------------------------------------------------------
router.get('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('service_orders')
      .select('*, contact:contacts(*), entity:entities(*), assigned_user:users(id, full_name, email)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service order not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Get service order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get service order' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id - Update service order
// ---------------------------------------------------------------------------
router.patch('/:id', validate(updateServiceOrderSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('service_orders')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service order not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update service order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update service order' },
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id - Delete service order
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('service_orders')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service order not found' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Service order deleted', id } });
  } catch (err) {
    logger.error('Delete service order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete service order' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id/status - Update status with validation
// ---------------------------------------------------------------------------
router.patch('/:id/status', validate(updateStatusSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;
    const { status: newStatus } = req.body;

    // Get current status
    const { data: existing } = await supabaseAdmin
      .from('service_orders')
      .select('status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service order not found' },
      });
      return;
    }

    // Validate transition
    const allowedTransitions = statusTransitions[existing.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `Cannot transition from '${existing.status}' to '${newStatus}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
        },
      });
      return;
    }

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Set timestamps based on status
    if (newStatus === 'in_progress') {
      updatePayload.actual_start = new Date().toISOString();
    } else if (newStatus === 'completed') {
      updatePayload.actual_end = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('service_orders')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update status' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update service order status error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update status' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/assign - Assign to user
// ---------------------------------------------------------------------------
router.post('/:id/assign', validate(assignSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;
    const { user_id } = req.body;

    // Verify user belongs to tenant
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', user_id)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    if (!user) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'User not found in this tenant' },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('service_orders')
      .update({ assigned_user_id: user_id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service order not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Assign service order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to assign service order' },
    });
  }
});

export default router;
