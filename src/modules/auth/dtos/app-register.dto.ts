import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AppRegisterDto {
  @ApiPropertyOptional({
    description: 'Token xác thực OTP đã nhận từ endpoint POST /auth/app/verify-otp',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsOptional()
  verificationToken?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại đăng ký tài khoản bệnh nhân (bắt buộc nếu không dùng verificationToken)',
    example: '0987654321',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiProperty({ description: 'Mật khẩu đăng nhập (tối thiểu 6 ký tự)', example: 'Pass@123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'Email liên hệ', example: 'patient@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
}
