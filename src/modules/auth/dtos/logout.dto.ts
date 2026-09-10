import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({
    description: 'Refresh Token cần thu hồi đồng thời khi đăng xuất (tùy chọn)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Trạng thái đăng xuất thành công',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Thông báo kết quả',
    example: 'Đăng xuất thành công',
  })
  message: string;
}
