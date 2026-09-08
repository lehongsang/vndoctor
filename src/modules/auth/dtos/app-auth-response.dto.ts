import { ApiProperty } from '@nestjs/swagger';
import { Account } from '@/modules/accounts/entities/account.entity';

export class AppAuthResponseDto {
  @ApiProperty({ description: 'JWT Access Token Bearer' })
  accessToken: string;

  @ApiProperty({ description: 'Loại token', example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Thời gian hiệu lực (giây)', example: 2592000 })
  expiresIn: number;

  @ApiProperty({ type: () => Account, description: 'Thông tin tài khoản bệnh nhân' })
  account: Partial<Account>;
}
