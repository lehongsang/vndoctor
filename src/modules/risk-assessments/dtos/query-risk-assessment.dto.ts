import { AssessmentStatus, VnDoctorRiskLevel } from '@/commons/enums/vndoctor.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

/**
 * Query DTO for searching and filtering risk assessments.
 */
export class QueryRiskAssessmentDto {
  @ApiPropertyOptional({ description: 'Filter by Health Profile ID (UUID)' })
  @IsOptional()
  @IsUUID('4', { message: 'healthProfileId must be a valid UUID' })
  healthProfileId?: string;

  @ApiPropertyOptional({ description: 'Filter by Facility ID (UUID)' })
  @IsOptional()
  @IsUUID('4', { message: 'facilityId must be a valid UUID' })
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Filter by Evaluating Doctor ID (UUID)' })
  @IsOptional()
  @IsUUID('4', { message: 'doctorId must be a valid UUID' })
  doctorId?: string;

  @ApiPropertyOptional({ enum: AssessmentStatus, enumName: 'AssessmentStatus' })
  @IsOptional()
  @IsEnum(AssessmentStatus, { message: 'status must be a valid AssessmentStatus' })
  status?: AssessmentStatus;

  @ApiPropertyOptional({ enum: VnDoctorRiskLevel, enumName: 'VnDoctorRiskLevel' })
  @IsOptional()
  @IsEnum(VnDoctorRiskLevel, { message: 'riskLevel must be a valid VnDoctorRiskLevel' })
  riskLevel?: VnDoctorRiskLevel;

  @ApiPropertyOptional({ description: 'Filter from assessment timestamp', example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'fromDate must be a valid date' })
  fromDate?: Date;

  @ApiPropertyOptional({ description: 'Filter to assessment timestamp', example: '2026-09-30T23:59:59.999Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'toDate must be a valid date' })
  toDate?: Date;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  limit?: number = 20;
}
