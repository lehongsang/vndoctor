import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class StaffLoginDto {
  @ApiProperty({ description: 'Tên đăng nhập của nhân viên / bác sĩ', example: 'dr_nguyenvanan' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Mật khẩu', example: 'Pass@123456' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
