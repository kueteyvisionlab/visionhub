import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types';

const router = Router();

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  full_name: z.string().min(1).max(255),
  tenant_name: z.string().min(1).max(255),
  tenant_slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

// ---------------------------------------------------------------------------
// POST /register - Create tenant + admin user
// ---------------------------------------------------------------------------
router.post('/register', authRateLimiter, validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, tenant_name, tenant_slug, phone } = req.body;

    // Check if tenant slug is taken
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', tenant_slug)
      .single();

    if (existingTenant) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Tenant slug already exists' },
      });
      return;
    }

    // Create auth user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      logger.error('Failed to create auth user', { error: authError?.message });
      res.status(400).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: authError?.message || 'Failed to create user' },
      });
      return;
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: tenant_name,
        slug: tenant_slug,
        phone: phone || null,
        plan: 'free',
        monthly_credits: 100,
        current_usage: {},
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      // Rollback: remove auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      logger.error('Failed to create tenant', { error: tenantError?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create tenant' },
      });
      return;
    }

    // Create application user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        tenant_id: tenant.id,
        auth_provider_id: authData.user.id,
        email,
        full_name,
        role: 'admin',
        is_active: true,
      })
      .select()
      .single();

    if (userError || !user) {
      // Rollback
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      logger.error('Failed to create user record', { error: userError?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create user record' },
      });
      return;
    }

    // Sign in to get tokens
    const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !session.session) {
      logger.error('Failed to sign in after registration', { error: signInError?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Account created but sign-in failed' },
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        user,
        tenant,
        session: {
          access_token: session.session.access_token,
          refresh_token: session.session.refresh_token,
          expires_at: session.session.expires_at,
        },
      },
    });
  } catch (err) {
    logger.error('Registration error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Registration failed' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------
router.post('/login', authRateLimiter, validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !session.session) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
      });
      return;
    }

    // Fetch application user + tenant
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*, tenant:tenants(*)')
      .eq('auth_provider_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User account not found or inactive' },
      });
      return;
    }

    const { tenant, ...userData } = user;

    res.json({
      success: true,
      data: {
        user: userData,
        tenant,
        session: {
          access_token: session.session.access_token,
          refresh_token: session.session.refresh_token,
          expires_at: session.session.expires_at,
        },
      },
    });
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Login failed' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /refresh
// ---------------------------------------------------------------------------
router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error || !data.session) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (err) {
    logger.error('Token refresh error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Token refresh failed' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------
router.get('/me', authenticate as any, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;

    res.json({
      success: true,
      data: {
        user: authReq.user,
        tenant: authReq.tenant,
      },
    });
  } catch (err) {
    logger.error('Get current user error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get user info' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /logout
// ---------------------------------------------------------------------------
router.post('/logout', authenticate as any, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.slice(7);
      await supabase.auth.admin.signOut(token);
    }

    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    logger.error('Logout error', err);
    // Still return success - client should discard tokens regardless
    res.json({ success: true, data: { message: 'Logged out' } });
  }
});

export default router;
