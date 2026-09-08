import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMyProfileDto {
  @ApiPropertyOptional({ description: 'Họ và tên', example: 'BS. CKII Nguyễn Văn An' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({ description: 'Email liên hệ', example: 'dr.an@hospital.vn' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Chuyên khoa', example: 'Nội tim mạch' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  specialty?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại liên hệ', example: '0912345678' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phoneNumber?: string;
}
