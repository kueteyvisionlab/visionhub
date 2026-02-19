import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { sanitizeForAudit } from '../utils/sanitize';

/**
 * HTTP methods that represent write operations and should be audited.
 */
const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Extract the resource type from a URL path.
 *
 * Given `/api/v1/contacts/abc-123/notes`, this returns `'contacts'`.
 * It strips the `/api/v1/` prefix (if present) and takes the first segment.
 */
function extractResourceType(path: string): string {
  // Remove /api/v1 or /api/v2 etc. prefix
  const stripped = path.replace(/^\/api\/v\d+\//, '/');
  // Split on slashes and grab the first meaningful segment
  const segments = stripped.split('/').filter(Boolean);
  return segments[0] || 'unknown';
}

/**
 * Extract a resource ID from the URL path.
 *
 * Looks for the second path segment after stripping the API prefix,
 * which conventionally holds the resource ID (e.g. `/contacts/:id`).
 * Returns `null` when no plausible ID segment is found.
 */
function extractResourceId(path: string): string | null {
  const stripped = path.replace(/^\/api\/v\d+\//, '/');
  const segments = stripped.split('/').filter(Boolean);
  // The second segment is typically the resource ID
  return segments.length >= 2 ? segments[1] : null;
}

/**
 * Resolve the client IP address, respecting proxy headers.
 */
function getClientIp(req: any): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || null;
}

/**
 * Audit log middleware — logs all write operations (POST/PATCH/PUT/DELETE)
 * to the audit_logs table for compliance and debugging.
 *
 * Must be placed AFTER authenticate middleware so req.user and req.tenant are available.
 */
export function auditLog(req: any, res: Response, next: NextFunction): void {
  // Only audit write operations
  if (!WRITE_METHODS.has(req.method)) {
    next();
    return;
  }

  const method = req.method;
  const path = req.originalUrl || req.url;
  const action = `${method} ${path}`;
  const resourceType = extractResourceType(path);
  const resourceId = extractResourceId(path);
  const userId = req.user?.id || null;
  const tenantId = req.tenant?.id || null;
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || null;

  // Sanitize the request body before logging
  const sanitizedBody = sanitizeForAudit(req.body);

  // -----------------------------------------------------------------------
  // Override res.json to capture the moment the response is sent,
  // then fire-and-forget the audit insert.
  // -----------------------------------------------------------------------
  const originalJson = res.json.bind(res);

  res.json = function auditJsonWrapper(body?: any): Response {
    // Restore original immediately so subsequent calls behave normally
    res.json = originalJson;

    // Fire-and-forget — intentionally NOT awaited
    insertAuditLog({
      tenant_id: tenantId,
      user_id: userId,
      action,
      entity_type: resourceType,
      entity_id: resourceId,
      old_values: null, // MVP: not fetching previous state
      new_values: sanitizedBody,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Send the actual response
    return originalJson(body);
  } as any;

  next();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface AuditRecord {
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
}

/**
 * Insert a record into the audit_logs table.
 * This is fire-and-forget: errors are caught and logged but never bubble up.
 */
function insertAuditLog(record: AuditRecord): void {
  Promise.resolve(
    supabaseAdmin
      .from('audit_logs')
      .insert(record)
  )
    .then(({ error }) => {
      if (error) {
        logger.error('Failed to insert audit log', {
          error: error.message,
          action: record.action,
          tenant_id: record.tenant_id,
        });
      }
    })
    .catch((err: unknown) => {
      // Absolute safety net — must never throw
      logger.error('Unexpected error inserting audit log', err);
    });
}
