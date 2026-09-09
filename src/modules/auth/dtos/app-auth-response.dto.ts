import { ApiProperty } from '@nestjs/swagger';
import { Account } from '@/modules/accounts/entities/account.entity';

export class AppAuthResponseDto {
  @ApiProperty({ description: 'JWT Access Token Bearer', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ description: 'JWT Refresh Token Bearer', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ description: 'Loại token', example: 'Bearer', default: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Thời gian hiệu lực accessToken (giây)', example: 86400 })
  expiresIn: number;

  @ApiProperty({ description: 'Thời gian hiệu lực refreshToken (giây)', example: 2592000 })
  refreshTokenExpiresIn: number;

  @ApiProperty({ type: () => Account, description: 'Thông tin tài khoản bệnh nhân' })
  account: Partial<Account>;
}
