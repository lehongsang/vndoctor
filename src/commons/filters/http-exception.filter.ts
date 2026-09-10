import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { getCorrelationId } from '../middlewares/correlation-id.middleware';
import { buildRequestLogMetadata } from './request-log-metadata';
import { ErrorCode } from '../exceptions/error-codes';

@Catch(HttpException)
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new LoggerService(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const correlationId = getCorrelationId(request);
    const requestMetadata = buildRequestLogMetadata(request, status);
    const errorCode = this.resolveErrorCode(exception, status);

    if (status >= 500) {
      this.logger.error(
        `[HttpException] ${exception.message}`,
        requestMetadata,
        correlationId,
        exception.stack || '',
      );
    } else {
      this.logger.warn(
        `[HttpException] ${errorCode}`,
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
   * Resolves ErrorCode from HttpException
   */
  private resolveErrorCode(exception: HttpException, status: number): string {
    const res = exception.getResponse();
    if (typeof res === 'object' && res !== null) {
      const resObj = res as Record<string, unknown>;
      if (typeof resObj.errorCode === 'string') {
        return resObj.errorCode;
      }
      if (typeof resObj.code === 'string') {
        return resObj.code;
      }
      if (typeof resObj.message === 'string' && Object.values(ErrorCode).includes(resObj.message as ErrorCode)) {
        return resObj.message;
      }
    }
    return this.mapStatusToCode(status);
  }

  /**
   * Maps HTTP status to a generic error code
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
