import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, UserRole } from '../types';
import { logger } from '../utils/logger';

/**
 * JWT authentication middleware.
 * Extracts the Bearer token, verifies it via Supabase Auth, loads the
 * corresponding user + tenant rows, and attaches them to the request.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' },
      });
      return;
    }

    const token = authHeader.slice(7);

    // Verify the JWT with Supabase Auth
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      logger.warn('Auth token verification failed', { error: authError?.message });
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
      return;
    }

    // Fetch the application user record with tenant info
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*, tenant:tenants(*)')
      .eq('auth_provider_id', authUser.id)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      logger.warn('User lookup failed', { authId: authUser.id, error: userError?.message });
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User account not found or inactive' },
      });
      return;
    }

    const { tenant, ...userData } = user;

    if (!tenant) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tenant not found for this user' },
      });
      return;
    }

    // Attach to request
    (req as AuthenticatedRequest).user = userData;
    (req as AuthenticatedRequest).tenant = tenant;

    // Update last_login_at asynchronously (fire-and-forget)
    supabaseAdmin
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)
      .then();

    next();
  } catch (err) {
    logger.error('Authentication middleware error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' },
    });
  }
}

/**
 * Role-based access control middleware factory.
 * Must be placed AFTER `authenticate` in the middleware chain.
 *
 * @example
 *   router.get('/admin-only', authenticate, requireRole('admin', 'super_admin'), handler);
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!roles.includes(authReq.user.role)) {
      logger.warn('Insufficient permissions', {
        userId: authReq.user.id,
        required: roles,
        actual: authReq.user.role,
      });
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of the following roles: ${roles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}
