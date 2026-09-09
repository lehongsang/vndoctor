import { CareRequestStatus } from '@/commons/enums/vndoctor.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * DTO for querying care requests with filtering and pagination.
 */
export class QueryCareRequestDto {
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
    description: 'Lọc theo ID gói đăng ký chăm sóc',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsOptional()
  @IsUUID('4', { message: 'subscriptionId phải là UUID hợp lệ' })
  subscriptionId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID nhân viên y tế được giao xử lý',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsOptional()
  @IsUUID('4', { message: 'assignedUserId phải là UUID hợp lệ' })
  assignedUserId?: string;

  @ApiPropertyOptional({
    enum: CareRequestStatus,
    enumName: 'CareRequestStatus',
    description: 'Lọc theo trạng thái yêu cầu: PENDING, IN_PROGRESS, RESOLVED, CANCELLED',
  })
  @IsOptional()
  @IsEnum(CareRequestStatus, { message: 'Trạng thái không hợp lệ' })
  status?: CareRequestStatus;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tiêu đề hoặc mã yêu cầu',
    example: 'tức ngực',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
