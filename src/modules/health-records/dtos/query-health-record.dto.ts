import { HealthMetricType } from '@/commons/enums/vndoctor.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

/**
 * Query DTO for retrieving time-series personal health records.
 */
export class QueryHealthRecordDto {
  @ApiPropertyOptional({ description: 'Filter by Health Profile ID (UUID)' })
  @IsOptional()
  @IsUUID('4', { message: 'healthProfileId must be a valid UUID' })
  healthProfileId?: string;

  @ApiPropertyOptional({
    enum: HealthMetricType,
    enumName: 'HealthMetricType',
    description: 'Filter by metric type (e.g. BLOOD_PRESSURE, BLOOD_GLUCOSE, etc.)',
  })
  @IsOptional()
  @IsEnum(HealthMetricType, { message: 'metricType must be a valid HealthMetricType' })
  metricType?: HealthMetricType;

  @ApiPropertyOptional({ description: 'Filter from measurement timestamp (ISO 8601)', example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'fromDate must be a valid date' })
  fromDate?: Date;

  @ApiPropertyOptional({ description: 'Filter to measurement timestamp (ISO 8601)', example: '2026-09-30T23:59:59.999Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'toDate must be a valid date' })
  toDate?: Date;

  @ApiPropertyOptional({ description: 'Page number (starts from 1)', default: 1 })
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
