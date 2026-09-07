import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CustomException } from '../exceptions/custom.exception';
import { LoggerService } from '../logger/logger.service';
import { getCorrelationId } from '../middlewares/correlation-id.middleware';
import { buildRequestLogMetadata } from './request-log-metadata';

@Catch(CustomException)
@Injectable()
export class CustomExceptionFilter implements ExceptionFilter {
  private readonly logger = new LoggerService(CustomExceptionFilter.name);

  catch(exception: CustomException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as Record<
      string,
      unknown
    >;
    const correlationId = getCorrelationId(request);
    const requestMetadata = buildRequestLogMetadata(request, status);

    // Log async (Fire-and-Forget) - not block request
    this.logExceptionAsync(exception, correlationId, requestMetadata, status);

    response.status(status).json({
      statusCode: status,
      message: exceptionResponse.message || exception.message,
      code: exceptionResponse.code,
    });
  }

  /**
   * Log exception async - Fire and Forget pattern
   * Not await, not block request
   */
  private logExceptionAsync(
    exception: CustomException,
    correlationId: string,
    requestMetadata: Record<string, unknown>,
    status: number,
  ): void {
    // Use setImmediate to defer logging, not block current request
    setImmediate(() => {
      try {
        // Context is already extracted in CustomException constructor
        const context = exception.context || 'Exception';
        this.logger.setContext(context);
        if (status >= 500) {
          this.logger.error(
            exception.message,
            requestMetadata,
            correlationId,
            exception.stack || '',
          );
        } else {
          this.logger.warn(exception.message, requestMetadata, correlationId);
        }
      } catch {
        // eslint-disable-next-line no-console
        console.error('[LoggingError]', 'Failed to log exception');
      }
    });
  }
}
