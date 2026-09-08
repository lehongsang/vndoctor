import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePatientLinkDto {
  @ApiPropertyOptional({
    description: 'ID cơ sở y tế (Tự động gán cơ sở của nhân viên thực hiện nếu không truyền)',
    example: 'd3b07384-d113-46fb-a709-a1b74a6fc6d0',
  })
  @IsUUID()
  @IsOptional()
  facilityId?: string;

  @ApiProperty({ description: 'ID hồ sơ sức khỏe bệnh nhân trên App', example: '018e6e5a-1234-7000-8000-000000000001' })
  @IsUUID()
  @IsNotEmpty()
  healthProfileId: string;

  @ApiProperty({ description: 'Số điện thoại dùng để tìm kiếm và liên kết', example: '0987654321' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Mã bệnh nhân do viện cấp (Mã hồ sơ BN)', example: 'BN-2026-0099' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  hospitalPatientCode?: string;
}
