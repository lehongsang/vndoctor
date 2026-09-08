import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterAppAccountDto {
  @ApiProperty({ description: 'Số điện thoại đăng ký (duy nhất)', example: '0987654321' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phoneNumber: string;

  @ApiProperty({ description: 'Mật khẩu tài khoản', example: 'Patient@123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'Email liên hệ', example: 'patient@example.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;
}
