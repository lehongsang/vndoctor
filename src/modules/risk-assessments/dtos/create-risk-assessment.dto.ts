import { AssessmentStatus } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
} from 'class-validator';

/**
 * DTO for submitting Cardiovascular & Metabolic Risk Factor Assessment inputs.
 */
export class CreateRiskAssessmentDto {
  @ApiProperty({ description: 'Health Profile ID (UUID)', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID('4', { message: 'healthProfileId must be a valid UUID' })
  @IsNotEmpty({ message: 'healthProfileId is required' })
  healthProfileId: string;

  @ApiPropertyOptional({ description: 'Facility ID (UUID) if assessed at a clinic/hospital' })
  @IsOptional()
  @IsUUID('4', { message: 'facilityId must be a valid UUID' })
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Patient has underlying chronic disease', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasUnderlyingDisease must be a boolean' })
  hasUnderlyingDisease?: boolean;

  @ApiPropertyOptional({ description: 'List of Chronic Disease UUIDs diagnosed', type: [String] })
  @IsOptional()
  @IsArray({ message: 'chronicDiseaseIds must be an array' })
  @IsUUID('4', { each: true, message: 'Each disease ID must be a valid UUID' })
  chronicDiseaseIds?: string[];

  @ApiPropertyOptional({ description: 'Phì đại thất trái (Left Ventricular Hypertrophy)', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasLeftVentricularHypertrophy must be a boolean' })
  hasLeftVentricularHypertrophy?: boolean;

  @ApiPropertyOptional({ description: 'Albumin niệu (Albuminuria)', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasAlbuminuria must be a boolean' })
  hasAlbuminuria?: boolean;

  @ApiPropertyOptional({ description: 'Bệnh võng mạc do đái tháo đường (Diabetic Retinopathy)', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasRetinopathy must be a boolean' })
  hasRetinopathy?: boolean;

  @ApiPropertyOptional({ description: 'Nhồi máu não thầm lặng (Silent Brain Infarct)', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasSilentBrainInfarct must be a boolean' })
  hasSilentBrainInfarct?: boolean;

  @ApiPropertyOptional({ description: 'Độ lọc cầu thận eGFR (mL/min/1.73m2)', example: 85.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'egfr must be a number' })
  egfr?: number;

  @ApiPropertyOptional({ description: 'Tỷ lệ Albumin/Creatinine niệu ACR (mg/g)', example: 25.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'acr must be a number' })
  acr?: number;

  @ApiPropertyOptional({ description: 'Chiều cao (cm)', example: 168.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'heightCm must be a number' })
  heightCm?: number;

  @ApiPropertyOptional({ description: 'Cân nặng (kg)', example: 66.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'weightKg must be a number' })
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Chỉ số khối cơ thể BMI', example: 23.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'bmi must be a number' })
  bmi?: number;

  @ApiPropertyOptional({ description: 'Huyết áp tâm thu Systolic BP (mmHg)', example: 135 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'systolicBp must be an integer' })
  systolicBp?: number;

  @ApiPropertyOptional({ description: 'Huyết áp tâm trương Diastolic BP (mmHg)', example: 85 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'diastolicBp must be an integer' })
  diastolicBp?: number;

  @ApiPropertyOptional({ description: 'Đang hút thuốc lá / thuốc lào', default: false })
  @IsOptional()
  @IsBoolean({ message: 'isSmoking must be a boolean' })
  isSmoking?: boolean;

  @ApiPropertyOptional({ description: 'Cholesterol toàn phần (mmol/L)', example: 5.2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'totalCholesterol must be a number' })
  totalCholesterol?: number;

  @ApiPropertyOptional({ description: 'HDL-Cholesterol (mmol/L)', example: 1.3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'hdlCholesterol must be a number' })
  hdlCholesterol?: number;

  @ApiPropertyOptional({ description: 'LDL-Cholesterol (mmol/L)', example: 3.2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ldlCholesterol must be a number' })
  ldlCholesterol?: number;

  @ApiPropertyOptional({ description: 'Triglycerides (mmol/L)', example: 2.1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'triglycerides must be a number' })
  triglycerides?: number;

  @ApiPropertyOptional({ description: 'Đường huyết đói Glucose (mmol/L)', example: 6.2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'glucoseFasting must be a number' })
  glucoseFasting?: number;

  @ApiPropertyOptional({
    enum: AssessmentStatus,
    enumName: 'AssessmentStatus',
    default: AssessmentStatus.SUBMITTED,
  })
  @IsOptional()
  @IsEnum(AssessmentStatus, { message: 'status must be a valid AssessmentStatus' })
  status?: AssessmentStatus;
}
