import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { getCorrelationId } from '../middlewares/correlation-id.middleware';
import { buildRequestLogMetadata } from './request-log-metadata';

/**
 * Global catch-all exception filter.
 * Catches any exception that is NOT handled by other specific filters
 * (e.g., TypeError, ReferenceError, or any unexpected error).
 *
 * MUST be registered FIRST in useGlobalFilters() so it runs LAST (NestJS checks in reverse order).
 */
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new LoggerService(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const correlationId = getCorrelationId(request);

    const isError = exception instanceof Error;
    const fallbackMessage = isError ? exception.message : 'Unknown error';
    const stack = isError ? exception.stack : '';
    const status = this.resolveStatusCode(exception, fallbackMessage);
    const message = this.resolveResponseMessage(exception, fallbackMessage);
    const logMessage = Array.isArray(message) ? message.join('; ') : message;
    const requestMetadata = buildRequestLogMetadata(request, status);

    if (status >= 500) {
      this.logger.error(
        `[UnhandledException] ${logMessage}`,
        requestMetadata,
        correlationId,
        stack || '',
      );
    } else {
      this.logger.warn(
        `[UnhandledHttpException] ${logMessage}`,
        requestMetadata,
        correlationId,
      );
    }

    // Never leak stack trace or internal details to the client.
    // Preserve known status codes (e.g. Unauthorized from auth guard).
    response.status(status).json({
      statusCode: status,
      message: status >= 500 ? 'Internal server error' : message,
      code: this.resolveErrorCode(exception, status),
    });
  }

  /**
   * Resolves an HTTP status from unknown exception shapes thrown by external libs/guards.
   *
   * @param exception - Unknown exception captured by catch-all filter.
   * @param message - Safe fallback message extracted from exception.
   * @returns HTTP status code to send to client.
   */
  private resolveStatusCode(exception: unknown, message: string): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (typeof exception === 'object' && exception !== null) {
      const errorObject = exception as Record<string, unknown>;
      const statusCode =
        typeof errorObject.statusCode === 'number'
          ? errorObject.statusCode
          : typeof errorObject.status === 'number'
            ? errorObject.status
            : undefined;
      if (statusCode !== undefined) {
        return statusCode;
      }
    }

    if (message === 'Unauthorized') {
      return 401;
    }
    if (message.startsWith('Cannot ') || message.startsWith('Cannot GET')) {
      return 404;
    }
    return 500;
  }

  /**
   * Extracts the detailed client-facing message from Nest HTTP exceptions.
   *
   * @param exception - Unknown exception captured by catch-all filter.
   * @param fallbackMessage - Message from the thrown Error object.
   * @returns Specific message or validation messages when available.
   */
  private resolveResponseMessage(
    exception: unknown,
    fallbackMessage: string,
  ): string | string[] {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        return exceptionResponse;
      }
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObject = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(responseObject.message)) {
          return responseObject.message.filter(
            (item): item is string => typeof item === 'string',
          );
        }
        if (typeof responseObject.message === 'string') {
          return responseObject.message;
        }
      }
    }

    return fallbackMessage;
  }

  /**
   * Resolves the machine-readable error code, checking custom error properties first.
   */
  private resolveErrorCode(exception: unknown, status: number): string {
    if (typeof exception === 'object' && exception !== null) {
      const errorObject = exception as Record<string, unknown>;
      if (typeof errorObject.code === 'string') {
        return errorObject.code;
      }
    }
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (typeof resObj.code === 'string') {
          return resObj.code;
        }
      }
    }
    return this.mapStatusToCode(status);
  }

  /**
   * Maps HTTP status to an API error code.
   *
   * @param status - HTTP status code.
   * @returns Standardized error code.
   */
  private mapStatusToCode(status: number): string {
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      408: 'REQUEST_TIMEOUT',
      409: 'CONFLICT',
      413: 'PAYLOAD_TOO_LARGE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };
    return statusCodeMap[status] || 'HTTP_ERROR';
  }
}
