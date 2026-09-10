import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';

export enum OtpPurpose {
  REGISTER = 'REGISTER',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  CHANGE_PHONE = 'CHANGE_PHONE',
  LOGIN_OTP = 'LOGIN_OTP',
}

export class SendOtpDto {
  @ApiProperty({
    description: 'Số điện thoại nhận mã OTP (định dạng Việt Nam: 09x, 08x, 03x, 07x, 05x hoặc +84)',
    example: '0987654321',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, {
    message: 'Số điện thoại không đúng định dạng Việt Nam hợp lệ',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Mục đích gửi OTP',
    enum: OtpPurpose,
    enumName: 'OtpPurpose',
    example: OtpPurpose.REGISTER,
  })
  @IsEnum(OtpPurpose)
  @IsNotEmpty()
  type: OtpPurpose;
}

export class SendOtpResponseDto {
  @ApiProperty({ description: 'Trạng thái gửi mã OTP thành công', example: true })
  success: boolean;

  @ApiProperty({ description: 'Thời gian hiệu lực của mã OTP (giây)', example: 300 })
  expiresInSeconds: number;

  @ApiProperty({ description: 'Thời gian có thể yêu cầu gửi lại OTP (giây)', example: 60 })
  retryAfterSeconds: number;
}
