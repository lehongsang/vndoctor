import { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';
import { PatientTargetStatus } from '@/commons/enums/vndoctor.enum';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryPatientTargetDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({ description: 'Filter by Health Profile ID' })
  @IsUUID()
  @IsOptional()
  healthProfileId?: string;

  @ApiPropertyOptional({ description: 'Filter by Doctor ID' })
  @IsUUID()
  @IsOptional()
  doctorId?: string;

  @ApiPropertyOptional({ enum: PatientTargetStatus, description: 'Filter by Target status' })
  @IsEnum(PatientTargetStatus)
  @IsOptional()
  status?: PatientTargetStatus;
}
