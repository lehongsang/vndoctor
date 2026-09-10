import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';
import { FacilityPatientLinkStatus } from '@/commons/enums/vndoctor.enum';

export class QueryPatientLinkDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({ description: 'Lọc theo ID cơ sở y tế' })
  @IsUUID()
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID hồ sơ sức khỏe bệnh nhân' })
  @IsUUID()
  @IsOptional()
  healthProfileId?: string;

  @ApiPropertyOptional({
    enum: FacilityPatientLinkStatus,
    enumName: 'FacilityPatientLinkStatus',
    description: 'Lọc theo trạng thái liên kết',
  })
  @IsEnum(FacilityPatientLinkStatus)
  @IsOptional()
  status?: FacilityPatientLinkStatus;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo số điện thoại' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo CCCD' })
  @IsString()
  @IsOptional()
  citizenId?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã bệnh nhân viện cấp' })
  @IsString()
  @IsOptional()
  hospitalPatientCode?: string;
}
