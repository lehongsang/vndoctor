import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/**
 * DTO for updating Care Team staff assignment for an active subscription.
 */
export class UpdateCareTeamDto {
  @ApiPropertyOptional({
    description: 'UUID mới của Bác sĩ phụ trách chính (Role DOCTOR, cùng viện)',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsOptional()
  @IsUUID('4', { message: 'assignedDoctorId phải là UUID v4 hợp lệ' })
  assignedDoctorId?: string;

  @ApiPropertyOptional({
    description: 'UUID mới của Điều dưỡng/Y tá hỗ trợ (Role NURSE, cùng viện)',
    example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  })
  @IsOptional()
  @IsUUID('4', { message: 'assignedNurseId phải là UUID v4 hợp lệ' })
  assignedNurseId?: string;

  @ApiPropertyOptional({
    description: 'UUID mới của Bác sĩ Chuyên gia cố vấn',
    example: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
  })
  @IsOptional()
  @IsUUID('4', { message: 'assignedExpertId phải là UUID v4 hợp lệ' })
  assignedExpertId?: string;
}
