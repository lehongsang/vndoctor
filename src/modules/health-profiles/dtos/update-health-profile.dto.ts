import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateHealthProfileDto } from './create-health-profile.dto';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateHealthProfileDto extends PartialType(CreateHealthProfileDto) {
  @ApiPropertyOptional({
    description: 'Mã hồ sơ bệnh nhân tại cơ sở y tế (Staff cập nhật mã BN nội bộ viện)',
    example: 'BN-2026-00123',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  hospitalPatientCode?: string;
}

