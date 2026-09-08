import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AppRegisterDto {
  @ApiProperty({ description: 'Số điện thoại đăng ký tài khoản bệnh nhân', example: '0987654321' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phoneNumber: string;

  @ApiProperty({ description: 'Mật khẩu đăng nhập', example: 'Pass@123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'Email liên hệ', example: 'patient@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
}
