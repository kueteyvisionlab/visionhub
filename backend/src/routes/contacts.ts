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

const createContactSchema = z.object({
  type: z.enum(['particulier', 'entreprise']),
  first_name: z.string().min(1).max(255),
  last_name: z.string().min(1).max(255),
  company_name: z.string().max(255).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
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
  gdpr_consent: z.boolean().default(false),
  preferred_channel: z.enum(['whatsapp', 'sms', 'email']).default('email'),
  whatsapp_number: z.string().max(20).nullable().optional(),
  reminder_enabled: z.boolean().default(true),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

const updateContactSchema = createContactSchema.partial();

const addTagsSchema = z.object({
  tags: z.array(z.string().min(1)).min(1),
});

// ---------------------------------------------------------------------------
// GET / - List contacts with pagination, search, tag filters
// ---------------------------------------------------------------------------
router.get('/', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { page, limit, offset } = parsePaginationParams(req.query);

    const search = req.query.search as string | undefined;
    const type = req.query.type as string | undefined;
    const tag = req.query.tag as string | undefined;

    let query = supabaseAdmin
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%,phone.ilike.%${search}%`,
      );
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to list contacts', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list contacts' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('List contacts error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list contacts' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create contact
// ---------------------------------------------------------------------------
router.post('/', validate(createContactSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        ...req.body,
        tenant_id: tenantId,
        user_id: authReq.user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create contact', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create contact' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Create contact error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create contact' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id - Get contact with details
// ---------------------------------------------------------------------------
router.get('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Get contact error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get contact' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id - Update contact
// ---------------------------------------------------------------------------
router.patch('/:id', validate(updateContactSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update(req.body)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update contact error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update contact' },
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id - Soft delete contact
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    // Soft delete by adding a deleted_at timestamp
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Contact deleted', id } });
  } catch (err) {
    logger.error('Delete contact error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete contact' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id/timeline - Contact timeline (orders, services, notes, emails)
// ---------------------------------------------------------------------------
router.get('/:id/timeline', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    // Verify contact exists
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (contactError || !contact) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' },
      });
      return;
    }

    // Fetch timeline items in parallel
    const [ordersResult, serviceOrdersResult, notesResult, dealsResult] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('id, order_number, type, status, total, created_at')
        .eq('contact_id', id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('service_orders')
        .select('id, order_type, status, scheduled_start, created_at')
        .eq('contact_id', id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('notes')
        .select('id, content, is_private, user_id, created_at')
        .eq('entity_type', 'contact')
        .eq('entity_id', id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('deals')
        .select('id, title, value, status, created_at')
        .eq('contact_id', id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    // Merge and sort by created_at desc
    const timeline = [
      ...(ordersResult.data || []).map((item) => ({ ...item, timeline_type: 'order' })),
      ...(serviceOrdersResult.data || []).map((item) => ({ ...item, timeline_type: 'service_order' })),
      ...(notesResult.data || []).map((item) => ({ ...item, timeline_type: 'note' })),
      ...(dealsResult.data || []).map((item) => ({ ...item, timeline_type: 'deal' })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ success: true, data: timeline });
  } catch (err) {
    logger.error('Contact timeline error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get contact timeline' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/tags - Add tags to contact
// ---------------------------------------------------------------------------
router.post('/:id/tags', validate(addTagsSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;
    const { tags: newTags } = req.body;

    // Get current contact
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('id, tags')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (contactError || !contact) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' },
      });
      return;
    }

    const existingTags: string[] = contact.tags || [];
    const mergedTags = [...new Set([...existingTags, ...newTags])];

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update({ tags: mergedTags })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to add tags' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Add tags error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to add tags' },
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id/tags/:tagId - Remove tag from contact
// ---------------------------------------------------------------------------
router.delete('/:id/tags/:tagId', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id, tagId } = req.params;

    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('id, tags')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (contactError || !contact) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' },
      });
      return;
    }

    const existingTags: string[] = contact.tags || [];
    const filteredTags = existingTags.filter((t) => t !== tagId);

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update({ tags: filteredTags })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to remove tag' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Remove tag error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to remove tag' },
    });
  }
});

export default router;
