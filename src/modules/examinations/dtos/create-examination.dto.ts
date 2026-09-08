import { ExaminationStatus } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

/**
 * DTO for creating a new Medical Examination record.
 */
export class CreateExaminationDto {
  @ApiProperty({ description: 'Health Profile ID (UUID)', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID('4', { message: 'healthProfileId must be a valid UUID' })
  @IsNotEmpty({ message: 'healthProfileId is required' })
  healthProfileId: string;

  @ApiPropertyOptional({ description: 'Facility ID (UUID). If omitted, defaults to doctor current facility' })
  @IsOptional()
  @IsUUID('4', { message: 'facilityId must be a valid UUID' })
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Linked Risk Factor Assessment Input ID (UUID)' })
  @IsOptional()
  @IsUUID('4', { message: 'assessmentInputId must be a valid UUID' })
  assessmentInputId?: string;

  @ApiPropertyOptional({ description: 'Heart rate (bpm)', example: 78 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'heartRate must be a number' })
  heartRate?: number;

  @ApiPropertyOptional({ description: 'Systolic blood pressure (mmHg)', example: 125 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'systolicBp must be a number' })
  systolicBp?: number;

  @ApiPropertyOptional({ description: 'Diastolic blood pressure (mmHg)', example: 82 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'diastolicBp must be a number' })
  diastolicBp?: number;

  @ApiPropertyOptional({ description: 'Body temperature (°C)', example: 36.8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'temperature must be a number' })
  temperature?: number;

  @ApiPropertyOptional({ description: 'SpO2 oxygen saturation (%)', example: 98 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'spo2 must be a number' })
  spo2?: number;

  @ApiPropertyOptional({ description: 'Height (cm)', example: 168.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'heightCm must be a number' })
  heightCm?: number;

  @ApiPropertyOptional({ description: 'Weight (kg)', example: 65.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'weightKg must be a number' })
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Body Mass Index (BMI)', example: 23.03 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'bmi must be a number' })
  bmi?: number;

  @ApiPropertyOptional({ description: 'Lý do đến khám (Reason for visit)', example: 'Khám định kỳ huyết áp, đau đầu chóng mặt nhẹ' })
  @IsOptional()
  @IsString({ message: 'reasonForVisit must be a string' })
  reasonForVisit?: string;

  @ApiPropertyOptional({ description: 'Triệu chứng lâm sàng (Clinical symptoms)', example: 'Huyết áp dao động, mệt mỏi khi gắng sức' })
  @IsOptional()
  @IsString({ message: 'clinicalSymptoms must be a string' })
  clinicalSymptoms?: string;

  @ApiProperty({ description: 'Chẩn đoán xác định (Diagnosis)', example: 'Tăng huyết áp vô căn (nguyên phát)' })
  @IsString({ message: 'diagnosis must be a string' })
  @IsNotEmpty({ message: 'diagnosis is required' })
  diagnosis: string;

  @ApiPropertyOptional({ description: 'Mã bệnh ICD-10 chính (Primary ICD-10 Code)', example: 'I10' })
  @IsOptional()
  @IsString({ message: 'icd10Code must be a string' })
  icd10Code?: string;

  @ApiPropertyOptional({ description: 'Kế hoạch điều trị & Đơn thuốc (Treatment plan & Prescription)', example: 'Amlodipine 5mg x 1 viên/ngày uống buổi sáng; Hạn chế ăn mặn' })
  @IsOptional()
  @IsString({ message: 'treatmentPlan must be a string' })
  treatmentPlan?: string;

  @ApiPropertyOptional({ description: 'Ngày hẹn tái khám (YYYY-MM-DD)', example: '2026-10-08' })
  @IsOptional()
  @IsDateString({}, { message: 'nextAppointmentDate must be in YYYY-MM-DD format' })
  nextAppointmentDate?: string;

  @ApiPropertyOptional({
    enum: ExaminationStatus,
    enumName: 'ExaminationStatus',
    default: ExaminationStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(ExaminationStatus, { message: 'status must be a valid ExaminationStatus' })
  status?: ExaminationStatus;
}
