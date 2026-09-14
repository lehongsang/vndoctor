import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO for querying messages in a conversation with flexible cursor support.
 */
export class QueryMessageDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại (bắt đầu từ 1 - dùng cho offset pagination)', default: 1 })
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
    description: 'Cursor lấy các tin nhắn cũ hơn (có thể là ISO Date string hoặc Message UUID)',
    example: '2026-09-08T10:00:00.000Z hoặc 018fa300-0000-7000-8000-000000000001',
  })
  @IsOptional()
  @IsString()
  before?: string;

  @ApiPropertyOptional({
    description: 'Cursor lấy các tin nhắn mới hơn (có thể là ISO Date string hoặc Message UUID)',
    example: '2026-09-08T10:00:00.000Z hoặc 018fa300-0000-7000-8000-000000000001',
  })
  @IsOptional()
  @IsString()
  after?: string;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm nội dung tin nhắn trong cuộc hội thoại',
    example: 'huyết áp',
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}
