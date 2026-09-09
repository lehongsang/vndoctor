import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

/**
 * DTO for Admin/Doctor assigning Care Team and activating the subscription.
 */
export class AssignAndActivateCareSubscriptionDto {
  @ApiProperty({
    description: 'UUID của Bác sĩ phụ trách chính (Role DOCTOR, cùng viện)',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsNotEmpty({ message: 'assignedDoctorId không được để trống' })
  @IsUUID('4', { message: 'assignedDoctorId phải là UUID v4 hợp lệ' })
  assignedDoctorId: string;

  @ApiProperty({
    description: 'UUID của Điều dưỡng/Y tá hỗ trợ (Role NURSE, cùng viện)',
    example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  })
  @IsNotEmpty({ message: 'assignedNurseId không được để trống' })
  @IsUUID('4', { message: 'assignedNurseId phải là UUID v4 hợp lệ' })
  assignedNurseId: string;

  @ApiPropertyOptional({
    description: 'UUID của Bác sĩ Chuyên gia cố vấn (Bắt buộc nếu gói là VIP)',
    example: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
  })
  @IsOptional()
  @IsUUID('4', { message: 'assignedExpertId phải là UUID v4 hợp lệ' })
  assignedExpertId?: string;
}
