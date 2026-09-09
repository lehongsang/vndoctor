import { CareSubscriptionStatus } from '@/commons/enums/vndoctor.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * DTO for querying care subscriptions with pagination and filtering.
 */
export class QueryCareSubscriptionDto {
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
    description: 'Lọc theo ID cơ sở y tế',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID('4', { message: 'facilityId phải là UUID hợp lệ' })
  facilityId?: string;

  @ApiPropertyOptional({
    enum: CareSubscriptionStatus,
    enumName: 'CareSubscriptionStatus',
    description: 'Lọc theo trạng thái: PENDING, ACTIVE, EXPIRED, CANCELLED',
  })
  @IsOptional()
  @IsEnum(CareSubscriptionStatus, { message: 'Trạng thái subscription không hợp lệ' })
  status?: CareSubscriptionStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo ID hồ sơ sức khỏe bệnh nhân',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsOptional()
  @IsUUID('4', { message: 'healthProfileId phải là UUID hợp lệ' })
  healthProfileId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID Bác sĩ phụ trách chính',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsOptional()
  @IsUUID('4', { message: 'doctorId phải là UUID hợp lệ' })
  doctorId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID Điều dưỡng hỗ trợ',
    example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  })
  @IsOptional()
  @IsUUID('4', { message: 'nurseId phải là UUID hợp lệ' })
  nurseId?: string;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tên bệnh nhân hoặc tên gói',
    example: 'Tim mạch',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
