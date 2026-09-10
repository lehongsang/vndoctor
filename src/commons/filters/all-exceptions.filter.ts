import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { getCorrelationId } from '../middlewares/correlation-id.middleware';
import { buildRequestLogMetadata } from './request-log-metadata';
import { ErrorCode } from '../exceptions/error-codes';

/**
 * Global catch-all exception filter.
 * Catches any exception that is NOT handled by other specific filters
 * (e.g., TypeError, ReferenceError, or any unexpected error).
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
    const errorCode = this.resolveErrorCode(exception, status);
    const requestMetadata = buildRequestLogMetadata(request, status);

    if (status >= 500) {
      this.logger.error(
        `[UnhandledException] ${fallbackMessage}`,
        requestMetadata,
        correlationId,
        stack || '',
      );
    } else {
      this.logger.warn(
        `[UnhandledHttpException] ${errorCode}`,
        requestMetadata,
        correlationId,
      );
    }

    response.status(status).json({
      statusCode: status,
      errorCode,
    });
  }

  /**
   * Resolves an HTTP status from unknown exception shapes thrown by external libs/guards.
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
   * Resolves the machine-readable error code, checking custom error properties first.
   */
  private resolveErrorCode(exception: unknown, status: number): string {
    if (typeof exception === 'object' && exception !== null) {
      const errorObject = exception as Record<string, unknown>;
      if (typeof errorObject.errorCode === 'string') {
        return errorObject.errorCode;
      }
      if (typeof errorObject.code === 'string') {
        return errorObject.code;
      }
    }
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (typeof resObj.errorCode === 'string') {
          return resObj.errorCode;
        }
        if (typeof resObj.code === 'string') {
          return resObj.code;
        }
      }
    }
    return this.mapStatusToCode(status);
  }

  /**
   * Maps HTTP status to an API error code.
   */
  private mapStatusToCode(status: number): string {
    const statusCodeMap: Record<number, string> = {
      400: ErrorCode.BAD_REQUEST,
      401: ErrorCode.UNAUTHORIZED,
      403: ErrorCode.FORBIDDEN,
      404: ErrorCode.RESOURCE_NOT_FOUND,
      405: ErrorCode.METHOD_NOT_ALLOWED,
      408: ErrorCode.REQUEST_TIMEOUT,
      409: ErrorCode.RESOURCE_ALREADY_EXISTS,
      413: ErrorCode.PAYLOAD_TOO_LARGE,
      422: ErrorCode.UNPROCESSABLE_ENTITY,
      429: ErrorCode.TOO_MANY_REQUESTS,
      500: ErrorCode.INTERNAL_SERVER_ERROR,
      502: ErrorCode.BAD_GATEWAY,
      503: ErrorCode.SERVICE_UNAVAILABLE,
      504: ErrorCode.GATEWAY_TIMEOUT,
    };
    return statusCodeMap[status] || ErrorCode.HTTP_ERROR;
  }
}
