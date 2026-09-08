import { ApiProperty } from '@nestjs/swagger';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';

export class StaffAuthResponseDto {
  @ApiProperty({ description: 'JWT Access Token Bearer' })
  accessToken: string;

  @ApiProperty({ description: 'Loại token', example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Thời gian hiệu lực (giây)', example: 86400 })
  expiresIn: number;

  @ApiProperty({ type: () => StaffUser, description: 'Thông tin nhân viên' })
  staff: Partial<StaffUser>;
}
