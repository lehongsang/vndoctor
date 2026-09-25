import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for patient rejecting a care package subscription registered on-site by medical facility staff.
 */
export class RejectCareSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Lý do từ chối gói chăm sóc do CSYT đề xuất/đăng ký hộ',
    example: 'Tôi chưa có nhu cầu tham gia gói chăm sóc này',
  })
  @IsOptional()
  @IsString({ message: 'Lý do từ chối phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do từ chối không được vượt quá 500 ký tự' })
  reason?: string;
}
