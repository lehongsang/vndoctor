import { VnDoctorRiskLevel } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO for doctor clinical evaluation of risk factor assessment.
 */
export class EvaluateRiskAssessmentDto {
  @ApiProperty({
    enum: VnDoctorRiskLevel,
    enumName: 'VnDoctorRiskLevel',
    description: 'Assessed Cardiovascular & Metabolic Risk Level (LOW, HIGH, VERY_HIGH)',
    example: VnDoctorRiskLevel.HIGH,
  })
  @IsEnum(VnDoctorRiskLevel, { message: 'riskLevel must be a valid VnDoctorRiskLevel' })
  @IsNotEmpty({ message: 'riskLevel is required' })
  riskLevel: VnDoctorRiskLevel;

  @ApiPropertyOptional({ description: 'Calculated 10-year risk score percentage (%)', example: 8.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'riskScore must be a number' })
  riskScore?: number;

  @ApiPropertyOptional({ description: 'Doctor diagnostic conclusion', example: 'Nguy cơ tim mạch cao do tăng huyết áp kèm đái tháo đường' })
  @IsOptional()
  @IsString({ message: 'conclusion must be a string' })
  conclusion?: string;

  @ApiPropertyOptional({ description: 'Doctor lifestyle and treatment recommendations', example: 'Điều chỉnh lối sống, giảm muối, kiểm soát HbA1c < 7.0%, tái khám sau 1 tháng' })
  @IsOptional()
  @IsString({ message: 'recommendations must be a string' })
  recommendations?: string;
}
