/**
 * Sanitization utilities for audit logging.
 *
 * Strips sensitive fields (passwords, tokens, secrets, etc.) from objects
 * before they are persisted to the audit_logs table.
 */

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'api_key',
  'apiKey',
  'authorization',
  'credit_card',
  'ssn',
  'credentials',
  'config_encrypted',
];

/** Maximum allowed length for any single string value in audit data. */
const MAX_STRING_LENGTH = 1000;

/**
 * Deep-clone an object and replace sensitive values with '[REDACTED]'.
 * String values longer than 1000 characters are truncated with an ellipsis.
 *
 * Safe for nested objects and arrays. Returns `null` for non-object / falsy
 * inputs so callers never have to guard against `undefined`.
 */
export function sanitizeForAudit(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }

  // Primitives — nothing to sanitize structurally, just truncate long strings.
  if (typeof data !== 'object') {
    if (typeof data === 'string' && data.length > MAX_STRING_LENGTH) {
      return data.substring(0, MAX_STRING_LENGTH) + '...[truncated]';
    }
    return data;
  }

  // Arrays — recurse into each element.
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForAudit(item));
  }

  // Plain objects — deep-clone & redact.
  const sanitized: Record<string, any> = {};

  for (const key of Object.keys(data)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    const value = data[key];

    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      sanitized[key] = value.substring(0, MAX_STRING_LENGTH) + '...[truncated]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForAudit(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
