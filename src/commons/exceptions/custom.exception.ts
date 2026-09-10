import { HttpException } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export interface CustomExceptionOptions {
  errorCode?: ErrorCode | string;
  code?: ErrorCode | string;
  statusCode: number;
  message?: string;
  context?: string;
  trace?: string;
}

export class CustomException extends HttpException {
  public readonly errorCode: ErrorCode | string;
  public readonly code: ErrorCode | string;
  public readonly context?: string;
  public readonly trace?: string;

  constructor(options: CustomExceptionOptions) {
    const finalErrorCode = options.errorCode || options.code || ErrorCode.INTERNAL_SERVER_ERROR;

    super(
      {
        statusCode: options.statusCode,
        errorCode: finalErrorCode,
      },
      options.statusCode,
    );

    this.errorCode = finalErrorCode;
    this.code = finalErrorCode;
    this.context = options.context;
    this.trace = options.trace;

    Object.setPrototypeOf(this, CustomException.prototype);
  }
}
