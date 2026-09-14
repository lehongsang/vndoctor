import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { MessageType } from '@/commons/enums/vndoctor.enum';

/**
 * DTO for querying shared resources inside a conversation.
 */
export class QueryConversationResourceDto {
  @ApiPropertyOptional({
    description: 'Lọc theo loại tài nguyên (IMAGE, FILE, EXAMINATION, RISK_ASSESSMENT, HEALTH_RECORD, etc.)',
    enum: MessageType,
  })
  @IsOptional()
  @IsEnum(MessageType, { message: 'resourceType phải là loại MessageType hợp lệ' })
  type?: MessageType;

  @ApiPropertyOptional({ description: 'Trang hiện tại (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng mục trên mỗi trang', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
