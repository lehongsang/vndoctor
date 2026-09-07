import type { Request } from 'express';

interface RequestUserSnapshot {
  id?: string;
  role?: string;
  patientId?: string | null;
  facilityId?: string | null;
}

const SECRET_LOG_KEYS = new Set([
  'password',
  'newpassword',
  'oldpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'otp',
  'code',
]);
const MAX_LOG_BODY_DEPTH = 8;

/**
 * Builds compact request metadata for operational exception logs.
 *
 * @param request - Express request that triggered the exception.
 * @param statusCode - HTTP status resolved for the response.
 * @returns Safe request metadata for log files.
 */
export function buildRequestLogMetadata(
  request: Request | undefined,
  statusCode: number,
): Record<string, unknown> {
  if (!request) {
    return { statusCode };
  }

  const user = request.user as RequestUserSnapshot | undefined;

  return {
    method: request.method,
    path: request.originalUrl ?? request.url,
    statusCode,
    userId: user?.id ?? null,
    role: user?.role ?? null,
    patientId: user?.patientId ?? null,
    facilityId: user?.facilityId ?? null,
    ip: request.ip,
    userAgent: request.headers?.['user-agent'] ?? null,
    query: request.query,
    body: sanitizeLogBody(request.body),
  };
}

/**
 * Removes high-risk secret fields before writing request bodies to logs.
 *
 * @param body - Request body captured from Express.
 * @returns Redacted body suitable for operational logging.
 */
export function sanitizeLogBody(body: unknown): unknown {
  return sanitizeLogValue(body, new WeakSet<object>(), 0);
}

/**
 * Recursively redacts request data while avoiding expensive or unsafe objects.
 *
 * @param value - Current value being sanitized.
 * @param seen - Object references already visited during this pass.
 * @param depth - Current recursion depth.
 * @returns Sanitized value that can be safely serialized.
 */
function sanitizeLogValue(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (!value || typeof value !== 'object') {
    return value ?? null;
  }
  if (depth >= MAX_LOG_BODY_DEPTH) {
    return '[MaxDepth]';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Buffer.isBuffer(value)) {
    return `[Buffer: ${value.length} bytes]`;
  }
  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, seen, depth + 1));
  }
  if (!isPlainObject(value)) {
    return `[${value.constructor?.name ?? 'Object'}]`;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const normalizedKey = normalizeLogKey(key);

    sanitized[key] = SECRET_LOG_KEYS.has(normalizedKey)
      ? '[REDACTED]'
      : sanitizeLogValue(nestedValue, seen, depth + 1);
  }

  return sanitized;
}

/**
 * Normalizes field names so camelCase, snake_case, and kebab-case secrets match.
 *
 * @param key - Raw request body field name.
 * @returns Lowercase alphanumeric key used for secret matching.
 */
function normalizeLogKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Checks whether a value is a plain data object that is safe to traverse.
 *
 * @param value - Object candidate to inspect.
 * @returns True when the object has a plain or null prototype.
 */
function isPlainObject(value: object): boolean {
  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === null || prototype === Object.prototype;
}
