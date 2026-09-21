import { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';
import { PatientTargetStatus } from '@/commons/enums/vndoctor.enum';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryPatientTargetDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({ description: 'Filter by Health Profile ID' })
  @IsUUID()
  @IsOptional()
  healthProfileId?: string;

  @ApiPropertyOptional({ description: 'Filter by Care Subscription ID' })
  @IsUUID()
  @IsOptional()
  careSubscriptionId?: string;

  @ApiPropertyOptional({ description: 'Filter by Primary Doctor ID' })
  @IsUUID()
  @IsOptional()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Filter by Expert Doctor ID' })
  @IsUUID()
  @IsOptional()
  expertId?: string;

  @ApiPropertyOptional({ enum: PatientTargetStatus, description: 'Filter by Target status' })
  @IsEnum(PatientTargetStatus)
  @IsOptional()
  status?: PatientTargetStatus;
}
