import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateStaffDto } from './create-staff.dto';

/**
 * DTO updating staff details.
 * Reuses CreateStaffDto omitting immutable fields (facilityId, staffCode, username, password).
 */
export class UpdateStaffDto extends PartialType(
  OmitType(CreateStaffDto, ['facilityId', 'staffCode', 'username', 'password'] as const),
) {
  @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
