import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { OtpPurpose } from './send-otp.dto';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Số điện thoại đã nhận mã OTP',
    example: '0987654321',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, {
    message: 'Số điện thoại không đúng định dạng Việt Nam hợp lệ',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Mã OTP gồm 6 chữ số',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Mã OTP phải gồm đúng 6 chữ số' })
  otp: string;

  @ApiProperty({
    description: 'Mục đích xác thực OTP',
    enum: OtpPurpose,
    enumName: 'OtpPurpose',
    example: OtpPurpose.REGISTER,
  })
  @IsEnum(OtpPurpose)
  @IsNotEmpty()
  type: OtpPurpose;
}

export class VerifyOtpResponseDto {
  @ApiProperty({ description: 'Trạng thái xác thực thành công', example: true })
  success: boolean;

  @ApiProperty({
    description: 'Token chứng minh số điện thoại đã được xác thực OTP (thời hạn 10 phút)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  verificationToken: string;

  @ApiProperty({ description: 'Thời gian hiệu lực của Verification Token (giây)', example: 600 })
  expiresInSeconds: number;
}
