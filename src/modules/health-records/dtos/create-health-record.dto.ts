import { HealthMetricType } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO for creating a new personal health record measurement.
 */
export class CreateHealthRecordDto {
  @ApiProperty({ description: 'Health Profile ID (UUID)', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID('4', { message: 'healthProfileId must be a valid UUID' })
  @IsNotEmpty({ message: 'healthProfileId is required' })
  healthProfileId: string;

  @ApiProperty({
    enum: HealthMetricType,
    enumName: 'HealthMetricType',
    description: 'Type of health metric (e.g., BLOOD_PRESSURE, BLOOD_GLUCOSE, HEART_RATE, SPO2, TEMPERATURE, WEIGHT, HEIGHT, BMI)',
    example: HealthMetricType.BLOOD_PRESSURE,
  })
  @IsEnum(HealthMetricType, { message: 'metricType must be a valid HealthMetricType' })
  @IsNotEmpty({ message: 'metricType is required' })
  metricType: HealthMetricType;

  @ApiProperty({ description: 'Primary measurement value (e.g. Systolic BP, Glucose, Weight)', example: 120.0 })
  @Type(() => Number)
  @IsNumber({}, { message: 'valueNumeric must be a number' })
  @IsNotEmpty({ message: 'valueNumeric is required' })
  valueNumeric: number;

  @ApiPropertyOptional({ description: 'Secondary measurement value (e.g. Diastolic BP for Blood Pressure)', example: 80.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'secondaryValue must be a number' })
  secondaryValue?: number;

  @ApiProperty({ description: 'Measurement unit (e.g., mmHg, mmol/L, bpm, %, °C, kg, cm)', example: 'mmHg' })
  @IsString({ message: 'unit must be a string' })
  @IsNotEmpty({ message: 'unit is required' })
  unit: string;

  @ApiPropertyOptional({ description: 'Context note (e.g., Đo lúc đói, Sau khi tập thể dục)', example: 'Đo buổi sáng lúc vừa ngủ dậy' })
  @IsOptional()
  @IsString({ message: 'note must be a string' })
  note?: string;

  @ApiPropertyOptional({ description: 'Timestamp when measurement was taken', example: '2026-09-08T08:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'measuredAt must be a valid date' })
  measuredAt?: Date;
}
