import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * DTO for Patient Mobile App login.
 */
export class AppLoginDto {
  @ApiProperty({ description: 'Số điện thoại đăng nhập', example: '0987654321' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'Mật khẩu đăng nhập', example: 'Pass@123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

