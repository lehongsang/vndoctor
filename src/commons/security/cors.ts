const CORS_ALLOWED_ORIGINS_ENV = 'CORS_ALLOWED_ORIGINS';

export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://vndoctorfe.onrender.com',
];

export type CorsOriginOption = true | string[];

/**
 * Parses a comma-separated origin list into distinct, non-empty origin strings.
 *
 * @param csvOrigins - Raw environment variable value that may contain comma-separated origins.
 * @returns Distinct origins preserving declaration order.
 */
export function parseCorsOriginList(csvOrigins?: string): string[] {
  if (!csvOrigins?.trim()) {
    return [];
  }

  return [...new Set(
    csvOrigins
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter((origin): origin is string => origin.length > 0),
  )];
}

/**
 * Builds the shared frontend origin allowlist used by HTTP CORS, Socket.IO, and Better Auth.
 * Uses default origins combined with the CSV environment variable.
 *
 * @returns Distinct, non-empty allowed origins.
 */
export function buildCorsOriginAllowlist(): string[] {
  const envOrigins = parseCorsOriginList(
    process.env[CORS_ALLOWED_ORIGINS_ENV],
  );

  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins])];
}

/**
 * Builds the runtime CORS origin option.
 * Development runs accept any browser origin to avoid local FE integration blocks.
 *
 * @returns `true` outside production, otherwise the configured production allowlist.
 */
export function buildCorsOriginOption(): CorsOriginOption {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  return buildCorsOriginAllowlist();
}
