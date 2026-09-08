import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FacilityPatientLinkStatus } from '@/commons/enums/vndoctor.enum';

export class UpdatePatientLinkDto {
  @ApiPropertyOptional({
    enum: FacilityPatientLinkStatus,
    enumName: 'FacilityPatientLinkStatus',
    description: 'Trạng thái liên kết (ACTIVE, UNLINKED, PENDING)',
  })
  @IsEnum(FacilityPatientLinkStatus)
  @IsOptional()
  status?: FacilityPatientLinkStatus;

  @ApiPropertyOptional({ description: 'Mã bệnh nhân do viện cấp', example: 'BN-2026-0099' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  hospitalPatientCode?: string;
}
