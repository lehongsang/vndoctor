import type { ArgumentsHost } from '@nestjs/common';
import { Catch, Injectable } from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { getCorrelationId } from '../middlewares/correlation-id.middleware';
import { APIError } from 'better-auth';
import { buildRequestLogMetadata } from './request-log-metadata';

interface BetterAuthError extends Error {
  status?: number;
  statusCode?: number;
  body?: {
    message?: string;
    code?: string;
  };
}

@Catch(APIError)
@Injectable()
export class BetterAuthErrorExceptionFilter implements ExceptionFilter {
  private readonly logger = new LoggerService(
    BetterAuthErrorExceptionFilter.name,
  );

  catch(exception: APIError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const error = exception as unknown as BetterAuthError;

    const status = error.statusCode || error.status || 500;
    const message =
      error.body?.message || error.message || 'Authentication error';
    const correlationId = getCorrelationId(request);
    const requestMetadata = buildRequestLogMetadata(request, status);

    // Log async (Fire-and-Forget) - Not block request
    this.logExceptionAsync(error, correlationId, requestMetadata, status);

    // Standardized response format — consistent across all filters
    response.status(status).json({
      statusCode: status,
      message,
      code: error.body?.code || 'AUTH_ERROR',
    });
  }

  /**
   * Log exception async - Fire and Forget pattern
   * Not await, not block request
   */
  private logExceptionAsync(
    error: BetterAuthError,
    correlationId: string,
    requestMetadata: Record<string, unknown>,
    status: number,
  ): void {
    // Use setImmediate to defer logging, not block current request
    setImmediate(() => {
      try {
        if (status >= 500) {
          this.logger.error(
            `[AuthException] ${error.message}`,
            requestMetadata,
            correlationId,
            error.stack || '',
          );
        } else {
          this.logger.warn(
            `[AuthException] ${error.message}`,
            requestMetadata,
            correlationId,
          );
        }
      } catch {
        this.logger.errorConsoleOnly(error.message);
      }
    });
  }
}
