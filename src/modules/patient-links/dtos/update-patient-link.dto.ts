import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
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
}

