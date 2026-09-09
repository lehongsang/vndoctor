import { ConversationStatus, ConversationType } from '@/commons/enums/vndoctor.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * DTO for querying conversations.
 */
export class QueryConversationDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng phần tử trên 1 trang', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: ConversationType,
    enumName: 'ConversationType',
    description: 'Lọc theo loại phòng chat: CARE_TEAM hoặc DIRECT',
  })
  @IsOptional()
  @IsEnum(ConversationType, { message: 'Loại hội thoại không hợp lệ' })
  type?: ConversationType;

  @ApiPropertyOptional({
    enum: ConversationStatus,
    enumName: 'ConversationStatus',
    description: 'Lọc theo trạng thái: ACTIVE, CLOSED, ARCHIVED',
  })
  @IsOptional()
  @IsEnum(ConversationStatus, { message: 'Trạng thái hội thoại không hợp lệ' })
  status?: ConversationStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo ID cơ sở y tế',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID('4', { message: 'facilityId phải là UUID hợp lệ' })
  facilityId?: string;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tên phòng chat',
    example: 'Trần Thị Mai',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
