import { ErrorCode } from './error-codes';
import { CustomException } from './custom.exception';

/**
 * Bad Request (400)
 * Used for validation errors, invalid input
 */
export class BadRequest extends CustomException {
  constructor(errorCode: ErrorCode | string = ErrorCode.INVALID_INPUT, message?: string) {
    super({
      statusCode: 400,
      errorCode,
      message,
    });
    Object.setPrototypeOf(this, BadRequest.prototype);
  }
}

/**
 * Unauthorized (401)
 * Used for authentication failures
 */
export class Unauthorized extends CustomException {
  constructor(errorCode: ErrorCode | string = ErrorCode.UNAUTHORIZED, message?: string) {
    super({
      statusCode: 401,
      errorCode,
      message,
    });
    Object.setPrototypeOf(this, Unauthorized.prototype);
  }
}

/**
 * Forbidden (403)
 * Used for authorization failures
 */
export class Forbidden extends CustomException {
  constructor(errorCode: ErrorCode | string = ErrorCode.FORBIDDEN, message?: string) {
    super({
      statusCode: 403,
      errorCode,
      message,
    });
    Object.setPrototypeOf(this, Forbidden.prototype);
  }
}

/**
 * Not Found (404)
 * Used when resource doesn't exist
 */
export class NotFound extends CustomException {
  constructor(errorCode: ErrorCode | string = ErrorCode.RESOURCE_NOT_FOUND, message?: string) {
    super({
      statusCode: 404,
      errorCode,
      message,
    });
    Object.setPrototypeOf(this, NotFound.prototype);
  }
}

/**
 * Conflict (409)
 * Used when resource already exists
 */
export class Conflict extends CustomException {
  constructor(errorCode: ErrorCode | string = ErrorCode.RESOURCE_ALREADY_EXISTS, message?: string) {
    super({
      statusCode: 409,
      errorCode,
      message,
    });
    Object.setPrototypeOf(this, Conflict.prototype);
  }
}

/**
 * Internal Server Error (500)
 * Used for unexpected server errors
 */
export class InternalError extends CustomException {
  constructor(errorCode: ErrorCode | string = ErrorCode.INTERNAL_SERVER_ERROR, message?: string) {
    super({
      statusCode: 500,
      errorCode,
      message,
    });
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

/**
 * Too Many Requests (429)
 * Used for rate limiting
 */
export class TooManyRequestsException extends CustomException {
  constructor(errorCode: ErrorCode | string = ErrorCode.TOO_MANY_REQUESTS, message?: string) {
    super({
      statusCode: 429,
      errorCode,
      message,
    });
    Object.setPrototypeOf(this, TooManyRequestsException.prototype);
  }
}
