import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { AuthenticatedRequest, TenantPlan } from '../types';
import { logger } from '../utils/logger';

/**
 * Requests-per-hour limits by plan tier.
 */
const PLAN_LIMITS: Record<TenantPlan, number> = {
  free: 100,
  starter: 1000,
  pro: 5000,
  enterprise: 10_000,
};

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Derive a rate-limit key from the tenant ID (so the whole tenant
 * shares one bucket) or fall back to IP for unauthenticated requests.
 */
function keyGenerator(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  if (authReq.tenant?.id) {
    return `tenant:${authReq.tenant.id}`;
  }
  return req.ip ?? 'unknown';
}

/**
 * Dynamically resolve the max number of requests based on the
 * authenticated tenant's plan.  Falls back to the free-tier limit
 * for unauthenticated callers.
 */
function resolveMax(req: Request): number {
  const authReq = req as AuthenticatedRequest;
  const plan = authReq.tenant?.plan ?? 'free';
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

/**
 * Express-rate-limit middleware configured for per-tenant, plan-aware
 * rate limiting.
 */
export const rateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: resolveMax as unknown as Options['max'],
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', { ip: _req.ip, key: keyGenerator(_req) });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    });
  },
});

/**
 * Stricter rate limiter for authentication endpoints (e.g. login / signup).
 * 20 requests per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please wait before trying again.',
      },
    });
  },
});
