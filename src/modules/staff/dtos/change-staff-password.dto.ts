import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangeStaffPasswordDto {
  @ApiProperty({ description: 'Mật khẩu hiện tại', example: 'OldPass@123' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ description: 'Mật khẩu mới', example: 'NewPass@123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
