import { ApiProperty } from '@nestjs/swagger';

export class TokenRefreshResponseDto {
  @ApiProperty({ description: 'JWT Access Token mới', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ description: 'JWT Refresh Token mới', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ description: 'Loại token', example: 'Bearer', default: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Thời gian hiệu lực accessToken (giây)', example: 86400 })
  expiresIn: number;

  @ApiProperty({ description: 'Thời gian hiệu lực refreshToken (giây)', example: 2592000 })
  refreshTokenExpiresIn: number;
}
