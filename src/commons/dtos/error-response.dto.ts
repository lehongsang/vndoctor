import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../exceptions/error-codes';

/**
 * Standard error response structure for the API
 */
export class ErrorResponseDto {
  /**
   * HTTP status code
   * @example 400
   */
  @ApiProperty({ example: 400 })
  statusCode: number;

  /**
   * Machine-readable error code for frontend handling
   * @example "INVALID_INPUT"
   */
  @ApiProperty({ enum: ErrorCode, enumName: 'ErrorCode', example: ErrorCode.INVALID_INPUT })
  errorCode: ErrorCode;

  /**
   * Machine-readable message code
   * @example "INVALID_INPUT"
   */
  @ApiProperty({ example: 'INVALID_INPUT' })
  messageCode: string;

  /**
   * Human-readable error message or validation details
   * @example "Dữ liệu đầu vào không hợp lệ"
   */
  @ApiProperty({ example: 'Dữ liệu đầu vào không hợp lệ' })
  message: string | string[];
}

