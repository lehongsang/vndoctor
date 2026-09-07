import type { Request, Response } from 'express';
import pino from 'pino';
import type { Options as PinoHttpOptions } from 'pino-http';
import { generateId } from '@/utils/nanoid-generators';
import { PinoLogStream } from './pino-log-stream';

interface RequestUserSnapshot {
  id?: string;
  role?: string;
  patientId?: string | null;
  facilityId?: string | null;
}

const logStream = new PinoLogStream();

export const appPinoLogger = pino(
  {
    level: process.env.LOG_LEVEL ?? 'debug',
    messageKey: 'message',
    timestamp: pino.stdTimeFunctions.isoTime,
    base: undefined,
  },
  logStream,
);

/**
 * Shared pino-http configuration used by nestjs-pino.
 */
export const pinoHttpOptions: PinoHttpOptions<Request, Response> = {
  logger: appPinoLogger,
  genReqId: (request: Request, response: Response) => {
    const correlationId =
      request.correlationId ||
      (request.headers['x-correlation-id'] as string | undefined) ||
      generateId();

    request.correlationId = correlationId;
    response.setHeader('X-Correlation-ID', correlationId);

    return correlationId;
  },
  customAttributeKeys: {
    reqId: 'correlationId',
    responseTime: 'durationMs',
  },
  customLogLevel: (_request: Request, response: Response, error?: Error) => {
    if (error || response.statusCode >= 500) {
      return 'error';
    }
    if (response.statusCode >= 400) {
      return 'warn';
    }

    return 'info';
  },
  customSuccessMessage: (
    request: Request,
    response: Response,
    responseTime: number,
  ) =>
    `[HTTP] ${request.method} ${request.originalUrl ?? request.url} ${response.statusCode} ${responseTime.toFixed(1)}ms`,
  customErrorMessage: (
    request: Request,
    response: Response,
    error: Error,
  ) =>
    `[HTTP] ${request.method} ${request.originalUrl ?? request.url} ${response.statusCode} ${error.message}`,
  customProps: (request: Request, response: Response) =>
    buildAccessLogProperties(request, response),
  autoLogging: true,
};

/**
 * Builds compact request metadata for automatic pino-http access logs.
 *
 * @param request Express request.
 * @param response Express response.
 * @returns Safe metadata attached to access logs.
 */
function buildAccessLogProperties(
  request: Request,
  response: Response,
): Record<string, unknown> {
  const user = request.user as RequestUserSnapshot | undefined;

  return {
    context: 'HttpAccess',
    method: request.method,
    path: request.originalUrl ?? request.url,
    statusCode: response.statusCode,
    userId: user?.id ?? null,
    role: user?.role ?? null,
    patientId: user?.patientId ?? null,
    facilityId: user?.facilityId ?? null,
    ip: request.ip,
    userAgent: request.headers['user-agent'] ?? null,
  };
}
