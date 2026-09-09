import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Min } from 'class-validator';

/**
 * DTO for querying messages in a conversation.
 */
export class QueryMessageDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng tin nhắn lấy ra trên 1 trang', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 30;

  @ApiPropertyOptional({
    description: 'Lấy các tin nhắn trước thời điểm này (Cursor-based pagination)',
    example: '2026-09-08T10:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'before phải là một đối tượng thời gian Date hợp lệ' })
  before?: Date;
}
