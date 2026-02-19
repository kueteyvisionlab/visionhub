import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types';
import { randomUUID } from 'crypto';

const router = Router();

// ---------------------------------------------------------------------------
// Portal-specific types & middleware
// ---------------------------------------------------------------------------

interface PortalRequest extends Request {
  portal: {
    contact_id: string;
    tenant_id: string;
    session_id: string;
  };
}

/**
 * Middleware that authenticates portal users via X-Portal-Token header.
 * Looks up client_portal_sessions, verifies not expired, and attaches
 * contact_id and tenant_id to the request.
 */
async function portalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers['x-portal-token'] as string | undefined;

    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing X-Portal-Token header' },
      });
      return;
    }

    const { data: session, error } = await supabaseAdmin
      .from('client_portal_sessions')
      .select('*')
      .eq('token_hash', token)
      .eq('is_active', true)
      .single();

    if (error || !session) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid portal token' },
      });
      return;
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      // Mark session as inactive
      await supabaseAdmin
        .from('client_portal_sessions')
        .update({ is_active: false })
        .eq('id', session.id);

      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Portal token has expired' },
      });
      return;
    }

    // Update last_accessed_at
    await supabaseAdmin
      .from('client_portal_sessions')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', session.id);

    // Attach portal context to request
    (req as PortalRequest).portal = {
      contact_id: session.contact_id,
      tenant_id: session.tenant_id,
      session_id: session.id,
    };

    next();
  } catch (err) {
    logger.error('Portal auth middleware error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Portal authentication failed' },
    });
  }
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const magicLinkSchema = z.object({
  contact_id: z.string().uuid(),
});

const portalAuthSchema = z.object({
  token: z.string().min(1),
});

const quoteRequestSchema = z.object({
  description: z.string().min(1).max(5000),
  entity_id: z.string().uuid().nullable().optional(),
});

const portalMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

// ---------------------------------------------------------------------------
// POST /magic-link - Generate magic link for client (admin/pro only)
// ---------------------------------------------------------------------------
router.post(
  '/magic-link',
  authenticate as any,
  requireRole('admin', 'super_admin', 'pro') as any,
  validate(magicLinkSchema),
  async (req: any, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenant.id;
      const { contact_id } = req.body;

      // Verify contact belongs to tenant
      const { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('id', contact_id)
        .eq('tenant_id', tenantId)
        .single();

      if (!contact) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Contact not found in this tenant' },
        });
        return;
      }

      // Generate token and session
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // +24 hours

      const { data: session, error } = await supabaseAdmin
        .from('client_portal_sessions')
        .insert({
          tenant_id: tenantId,
          contact_id,
          token_hash: token,
          expires_at: expiresAt,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create portal session', { error: error.message });
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to generate magic link' },
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          token,
          expires_at: expiresAt,
          contact,
          session_id: session.id,
        },
      });
    } catch (err) {
      logger.error('Generate magic link error', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate magic link' },
      });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /auth - Public. Validate magic link token
// ---------------------------------------------------------------------------
router.post('/auth', validate(portalAuthSchema), async (req: any, res: Response) => {
  try {
    const { token } = req.body;

    const { data: session, error } = await supabaseAdmin
      .from('client_portal_sessions')
      .select('*')
      .eq('token_hash', token)
      .eq('is_active', true)
      .single();

    if (error || !session) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
      return;
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      await supabaseAdmin
        .from('client_portal_sessions')
        .update({ is_active: false })
        .eq('id', session.id);

      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token has expired' },
      });
      return;
    }

    // Fetch contact info
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id, first_name, last_name, email, phone, company_name')
      .eq('id', session.contact_id)
      .eq('tenant_id', session.tenant_id)
      .single();

    if (!contact) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' },
      });
      return;
    }

    // Update last_accessed_at
    await supabaseAdmin
      .from('client_portal_sessions')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', session.id);

    res.json({
      success: true,
      data: {
        contact,
        session: {
          id: session.id,
          expires_at: session.expires_at,
          tenant_id: session.tenant_id,
        },
      },
    });
  } catch (err) {
    logger.error('Portal auth validation error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to validate token' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /dashboard - Portal dashboard (portal auth)
// ---------------------------------------------------------------------------
router.get('/dashboard', portalAuth as any, async (req: any, res: Response) => {
  try {
    const portalReq = req as PortalRequest;
    const { contact_id, tenant_id } = portalReq.portal;

    // Fetch in parallel: entities, recent orders, unread messages count
    const [entitiesResult, ordersResult, messagesResult] = await Promise.all([
      supabaseAdmin
        .from('entities')
        .select('id, entity_type, name, primary_identifier, status')
        .eq('contact_id', contact_id)
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false })
        .limit(20),

      supabaseAdmin
        .from('orders')
        .select('id, order_number, type, status, total, created_at')
        .eq('contact_id', contact_id)
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false })
        .limit(10),

      supabaseAdmin
        .from('portal_messages')
        .select('id', { count: 'exact', head: true })
        .eq('contact_id', contact_id)
        .eq('tenant_id', tenant_id)
        .eq('is_read', false)
        .eq('direction', 'outbound'),
    ]);

    res.json({
      success: true,
      data: {
        entities: entitiesResult.data || [],
        recent_orders: ordersResult.data || [],
        unread_messages_count: messagesResult.count || 0,
      },
    });
  } catch (err) {
    logger.error('Portal dashboard error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch portal dashboard' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /orders - Portal: list contact's orders
// ---------------------------------------------------------------------------
router.get('/orders', portalAuth as any, async (req: any, res: Response) => {
  try {
    const portalReq = req as PortalRequest;
    const { contact_id, tenant_id } = portalReq.portal;
    const { page, limit, offset } = parsePaginationParams(req.query);

    const { data, error, count } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, type, status, total, created_at, valid_until', { count: 'exact' })
      .eq('contact_id', contact_id)
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to list portal orders', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list orders' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('Portal list orders error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list orders' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /orders/:id/accept - Portal: accept order
// ---------------------------------------------------------------------------
router.post('/orders/:id/accept', portalAuth as any, async (req: any, res: Response) => {
  try {
    const portalReq = req as PortalRequest;
    const { contact_id, tenant_id } = portalReq.portal;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('contact_id', contact_id)
      .eq('tenant_id', tenant_id)
      .in('status', ['sent'])
      .select()
      .single();

    if (error || !data) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Order not found or not in a status that can be accepted' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Portal accept order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to accept order' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /orders/:id/reject - Portal: reject order
// ---------------------------------------------------------------------------
router.post('/orders/:id/reject', portalAuth as any, async (req: any, res: Response) => {
  try {
    const portalReq = req as PortalRequest;
    const { contact_id, tenant_id } = portalReq.portal;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('contact_id', contact_id)
      .eq('tenant_id', tenant_id)
      .in('status', ['sent'])
      .select()
      .single();

    if (error || !data) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Order not found or not in a status that can be rejected' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Portal reject order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to reject order' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /quote-requests - Portal: create quote request
// ---------------------------------------------------------------------------
router.post('/quote-requests', portalAuth as any, validate(quoteRequestSchema), async (req: any, res: Response) => {
  try {
    const portalReq = req as PortalRequest;
    const { contact_id, tenant_id } = portalReq.portal;
    const { description, entity_id } = req.body;

    const { data, error } = await supabaseAdmin
      .from('portal_quote_requests')
      .insert({
        tenant_id,
        contact_id,
        description,
        entity_id: entity_id || null,
        attachments: [],
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create quote request', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create quote request' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Portal create quote request error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create quote request' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /messages - Portal: list messages for contact
// ---------------------------------------------------------------------------
router.get('/messages', portalAuth as any, async (req: any, res: Response) => {
  try {
    const portalReq = req as PortalRequest;
    const { contact_id, tenant_id } = portalReq.portal;
    const { page, limit, offset } = parsePaginationParams(req.query);

    const { data, error, count } = await supabaseAdmin
      .from('portal_messages')
      .select('*', { count: 'exact' })
      .eq('contact_id', contact_id)
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to list portal messages', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list messages' },
      });
      return;
    }

    // Mark inbound-to-contact (outbound from tenant) messages as read
    if (data && data.length > 0) {
      const unreadIds = data
        .filter((m: any) => m.direction === 'outbound' && !m.is_read)
        .map((m: any) => m.id);

      if (unreadIds.length > 0) {
        await supabaseAdmin
          .from('portal_messages')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('Portal list messages error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list messages' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /messages - Portal: send message
// ---------------------------------------------------------------------------
router.post('/messages', portalAuth as any, validate(portalMessageSchema), async (req: any, res: Response) => {
  try {
    const portalReq = req as PortalRequest;
    const { contact_id, tenant_id } = portalReq.portal;
    const { content } = req.body;

    const { data, error } = await supabaseAdmin
      .from('portal_messages')
      .insert({
        tenant_id,
        contact_id,
        user_id: null,
        direction: 'inbound',
        subject: null,
        body: content,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to send portal message', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to send message' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Portal send message error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send message' },
    });
  }
});

export default router;
