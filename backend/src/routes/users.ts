import { Router, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  full_name: z.string().min(1).max(255),
  role: z.enum(['admin', 'pro', 'client']),
  avatar_url: z.string().url().nullable().optional(),
});

const updateUserSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  role: z.enum(['admin', 'pro', 'client']).optional(),
  avatar_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// GET / - List users in tenant
// ---------------------------------------------------------------------------
router.get('/', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { page, limit, offset } = parsePaginationParams(req.query);

    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;

    let query = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to list users', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('List users error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create user (admin only)
// ---------------------------------------------------------------------------
router.post('/', requireRole('admin', 'super_admin'), validate(createUserSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { email, password, full_name, role, avatar_url } = req.body;

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      res.status(400).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: authError?.message || 'Failed to create auth user' },
      });
      return;
    }

    // Create application user
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        tenant_id: tenantId,
        auth_provider_id: authData.user.id,
        email,
        full_name,
        role,
        avatar_url: avatar_url || null,
        is_active: true,
      })
      .select()
      .single();

    if (error || !data) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      logger.error('Failed to create user record', { error: error?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Create user error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id - Get user
// ---------------------------------------------------------------------------
router.get('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Get user error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id - Update user
// ---------------------------------------------------------------------------
router.patch('/:id', validate(updateUserSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    // Users can update themselves; admins can update anyone in tenant
    if (authReq.user.id !== id && !['admin', 'super_admin'].includes(authReq.user.role)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot update other users' },
      });
      return;
    }

    // Non-admins cannot change role
    if (req.body.role && !['admin', 'super_admin'].includes(authReq.user.role)) {
      delete req.body.role;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(req.body)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update user error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' },
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id - Deactivate user (soft delete)
// ---------------------------------------------------------------------------
router.delete('/:id', requireRole('admin', 'super_admin'), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    // Cannot deactivate yourself
    if (authReq.user.id === id) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Cannot deactivate your own account' },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'User deactivated', id } });
  } catch (err) {
    logger.error('Deactivate user error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate user' },
    });
  }
});

export default router;
