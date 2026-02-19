import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

/**
 * Tenant isolation middleware.
 * Must be placed AFTER `authenticate`. It ensures that a valid tenant
 * context exists on the request so every downstream query can be
 * scoped to the correct tenant without forgetting the filter.
 *
 * Adds `req.tenantId` as a convenience shorthand.
 */
export function tenantIsolation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user || !req.tenant) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication with tenant context required' },
    });
    return;
  }

  const tenantId = req.tenant.id;

  if (!tenantId) {
    logger.error('Tenant ID missing after authentication', { userId: req.user.id });
    res.status(500).json({
      success: false,
      error: { code: 'TENANT_ERROR', message: 'Could not determine tenant context' },
    });
    return;
  }

  // Expose a convenience property
  (req as AuthenticatedRequest & { tenantId: string }).tenantId = tenantId;

  next();
}

/**
 * Helper to extract the tenant_id from an authenticated request.
 * Use this inside route handlers / services instead of accessing
 * req.tenant.id directly so the coupling stays in one place.
 */
export function getTenantId(req: AuthenticatedRequest): string {
  return req.tenant.id;
}
