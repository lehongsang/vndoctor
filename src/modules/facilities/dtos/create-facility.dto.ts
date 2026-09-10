import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { FacilityType } from '@/commons/enums/vndoctor.enum';

export class CreateFacilityDto {
  @ApiProperty({ description: 'Tên cơ sở y tế', example: 'Bệnh viện Chợ Rẫy' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  facilityName: string;

  @ApiPropertyOptional({
    enum: FacilityType,
    enumName: 'FacilityType',
    description: 'Phân loại cấp bậc cơ sở y tế',
    default: FacilityType.CLINIC,
  })
  @IsEnum(FacilityType)
  @IsOptional()
  facilityType?: FacilityType;

  @ApiPropertyOptional({
    description: 'ID cơ sở y tế cấp trên trực tiếp (nếu là cơ sở trực thuộc)',
    example: 'd3b07384-d113-46fb-a709-a1b74a6fc6d0',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại liên hệ', example: '02838554137' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiProperty({ description: 'Địa chỉ cơ sở', example: '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP.HCM' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
