import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class RequestPatientLinkDto {
  @ApiProperty({
    description: 'UUID của hồ sơ sức khỏe cần gửi yêu cầu liên kết',
    example: '018e6e5a-1234-7000-8000-000000000001',
  })
  @IsUUID('all')
  @IsNotEmpty()
  healthProfileId: string;

  @ApiProperty({
    description: 'Số điện thoại của tài khoản App bệnh nhân để gửi yêu cầu liên kết',
    example: '0987654321',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phoneNumber: string;
}

