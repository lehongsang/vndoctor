import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO for Assigning, Picking, or Escalating / Re-assigning a Care Request to a Doctor or Nurse.
 */
export class AssignCareRequestDto {
  @ApiProperty({
    description: 'UUID của nhân viên y tế nhận xử lý ca (Role DOCTOR hoặc NURSE, cùng cơ sở y tế)',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsNotEmpty({ message: 'assignedUserId không được để trống' })
  @IsUUID('4', { message: 'assignedUserId phải là UUID v4 hợp lệ' })
  assignedUserId: string;

  @ApiPropertyOptional({
    description: 'Ghi chú bàn giao hoặc lý do chuyển ca sang Bác sĩ',
    example: 'Điều dưỡng đã kiểm tra, nghi ngờ bệnh nhân bị tác dụng phụ của thuốc, chuyển BS. An chỉ định.',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi văn bản' })
  note?: string;
}
