import { AssessmentStatus } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * DTO for submitting Cardiovascular & Metabolic Risk Factor Assessment inputs.
 * Hỗ trợ 2 luồng: Không có bệnh nền (SCORE2 6 chỉ số) & Có bệnh nền (Tổn thương cơ quan đích & Bệnh lý mạn tính).
 */
export class CreateRiskAssessmentDto {
  @ApiProperty({ description: 'Health Profile ID (UUID)', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID(undefined, { message: 'healthProfileId must be a valid UUID' })
  @IsNotEmpty({ message: 'healthProfileId is required' })
  healthProfileId: string;

  @ApiPropertyOptional({ description: 'Facility ID (UUID) if assessed at a clinic/hospital' })
  @IsOptional()
  @IsUUID(undefined, { message: 'facilityId must be a valid UUID' })
  facilityId?: string;

  @ApiProperty({ description: 'Patient has underlying chronic disease', default: false, example: false })
  @IsOptional()
  @IsBoolean({ message: 'hasUnderlyingDisease must be a boolean' })
  hasUnderlyingDisease?: boolean = false;

  @ApiPropertyOptional({ description: 'List of Chronic Disease UUIDs diagnosed', type: [String] })
  @IsOptional()
  @IsArray({ message: 'chronicDiseaseIds must be an array' })
  @IsUUID(undefined, { each: true, message: 'Each disease ID must be a valid UUID' })
  chronicDiseaseIds?: string[];

  // ==========================================
  // LUỒNG 1: 6 CHỈ SỐ SINH LÝ CƠ BẢN (SCORE2)
  // ==========================================

  @ApiPropertyOptional({ description: 'Tuổi thật (0 - 200)', example: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'age must be a number' })
  @Min(0)
  @Max(200)
  age?: number;

  @ApiPropertyOptional({ description: 'Giới tính (Nam / Nữ)', example: 'Nam' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Thói quen hút thuốc lá', default: false, example: true })
  @IsOptional()
  @IsBoolean({ message: 'isSmoking must be a boolean' })
  isSmoking?: boolean;

  @ApiPropertyOptional({ description: 'Huyết áp tâm thu sbp (50 - 260 mmHg)', example: 145 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'sbp must be a number' })
  @Min(50)
  @Max(260)
  sbp?: number;

  @ApiPropertyOptional({ description: 'Huyết áp tâm thu (alias của sbp)', example: 145 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'systolicBp must be a number' })
  systolicBp?: number;

  @ApiPropertyOptional({ description: 'Huyết áp tâm trương (mmHg)', example: 85 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'diastolicBp must be a number' })
  diastolicBp?: number;

  @ApiPropertyOptional({ description: 'Cholesterol toàn phần (1 - 30 mmol/L)', example: 7.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'cholesterol must be a number' })
  @Min(1)
  @Max(30)
  cholesterol?: number;

  @ApiPropertyOptional({ description: 'Total Cholesterol (alias của cholesterol)', example: 7.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'totalCholesterol must be a number' })
  totalCholesterol?: number;

  @ApiPropertyOptional({ description: 'HDL - Cholesterol (0.1 - 10 mmol/L)', example: 1.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'hdl must be a number' })
  @Min(0.1)
  @Max(10)
  hdl?: number;

  @ApiPropertyOptional({ description: 'HDL Cholesterol (alias của hdl)', example: 1.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'hdlCholesterol must be a number' })
  hdlCholesterol?: number;

  @ApiPropertyOptional({ description: 'LDL Cholesterol (mmol/L)', example: 3.2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ldlCholesterol must be a number' })
  ldlCholesterol?: number;

  @ApiPropertyOptional({ description: 'Triglycerides (mmol/L)', example: 2.1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'triglycerides must be a number' })
  triglycerides?: number;

  @ApiPropertyOptional({ description: 'Đường huyết đói (mmol/L)', example: 6.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'glucoseFasting must be a number' })
  glucoseFasting?: number;

  @ApiPropertyOptional({ description: 'Chiều cao (cm)', example: 168.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'heightCm must be a number' })
  heightCm?: number;

  @ApiPropertyOptional({ description: 'Cân nặng (kg)', example: 65.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'weightKg must be a number' })
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Chỉ số khối cơ thể BMI', example: 23.2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'bmi must be a number' })
  bmi?: number;

  // ==========================================
  // LUỒNG 2: TỔN THƯƠNG CƠ QUAN ĐÍCH (Target Organ Damage)
  // ==========================================

  @ApiPropertyOptional({ description: 'Phì đại thất trái trên ECG / siêu âm tim', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasLeftVentricularHypertrophy must be a boolean' })
  hasLeftVentricularHypertrophy?: boolean;

  @ApiPropertyOptional({ description: 'Có Albumin / Microalbumin niệu', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasAlbuminuriaOrMicroalbuminuria must be a boolean' })
  hasAlbuminuriaOrMicroalbuminuria?: boolean;

  @ApiPropertyOptional({ description: 'Có Albumin niệu (alias)', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasAlbuminuria must be a boolean' })
  hasAlbuminuria?: boolean;

  @ApiPropertyOptional({ description: 'Tổn thương đáy mắt / thành mạch cảnh', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasCarotidWallDamage must be a boolean' })
  hasCarotidWallDamage?: boolean;

  @ApiPropertyOptional({ description: 'Tổn thương đáy mắt (alias)', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasRetinopathy must be a boolean' })
  hasRetinopathy?: boolean;

  @ApiPropertyOptional({ description: 'Tổn thương thầm lặng trên não', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasSilentInfarct must be a boolean' })
  hasSilentInfarct?: boolean;

  @ApiPropertyOptional({ description: 'Tổn thương thầm lặng trên não (alias)', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasSilentBrainInfarct must be a boolean' })
  hasSilentBrainInfarct?: boolean;

  // ==========================================
  // LUỒNG 2: BỆNH LÝ MẠN TÍNH & BIẾN CHỨNG (Chronic Diseases)
  // ==========================================

  @ApiPropertyOptional({ description: 'Có mắc đái tháo đường hay không', default: false })
  @IsOptional()
  @IsBoolean({ message: 'diabetes must be a boolean' })
  diabetes?: boolean;

  @ApiPropertyOptional({ description: 'Số năm mắc đái tháo đường (0 - 100 năm)', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'diabetesDurationYears must be a number' })
  @Min(0)
  @Max(100)
  diabetesDurationYears?: number;

  @ApiPropertyOptional({ description: 'Mức kiểm soát đường máu (Tốt / Không tốt)', example: 'Không tốt' })
  @IsOptional()
  @IsString()
  glycemicControl?: string;

  @ApiPropertyOptional({ description: 'Độ thanh thải cầu thận eGFR (0 - 200 mL/phút/1.73m2)', example: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'eGFR must be a number' })
  @Min(0)
  @Max(200)
  eGFR?: number;

  @ApiPropertyOptional({ description: 'Độ thanh thải cầu thận (alias của eGFR)', example: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'egfr must be a number' })
  egfr?: number;

  @ApiPropertyOptional({ description: 'Tỷ lệ Albumin/Creatinin niệu ACR (0 - 5000 mg/g)', example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'acr must be a number' })
  @Min(0)
  @Max(5000)
  acr?: number;

  @ApiPropertyOptional({ description: 'Tiền sử đột quỵ não', default: false })
  @IsOptional()
  @IsBoolean({ message: 'stroke must be a boolean' })
  stroke?: boolean;

  @ApiPropertyOptional({ description: 'Nhồi máu cơ tim', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasMyocardialInfarction must be a boolean' })
  hasMyocardialInfarction?: boolean;

  @ApiPropertyOptional({ description: 'Hội chứng vành cấp', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasAcuteCoronarySyndrome must be a boolean' })
  hasAcuteCoronarySyndrome?: boolean;

  @ApiPropertyOptional({ description: 'Bệnh lý động mạch vành', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasCoronaryArteryDisease must be a boolean' })
  hasCoronaryArteryDisease?: boolean;

  @ApiPropertyOptional({ description: 'Cơn thiếu máu não cục bộ thoáng qua (TIA)', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasTia must be a boolean' })
  hasTia?: boolean;

  @ApiPropertyOptional({ description: 'Phình động mạch chủ', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasAorticAneurysm must be a boolean' })
  hasAorticAneurysm?: boolean;

  @ApiPropertyOptional({ description: 'Bệnh mạch máu ngoại vi', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasPeripheralArteryDisease must be a boolean' })
  hasPeripheralArteryDisease?: boolean;

  @ApiPropertyOptional({ description: 'Vữa xơ mạch máu lớn', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasAtherosclerosis must be a boolean' })
  hasAtherosclerosis?: boolean;

  @ApiPropertyOptional({ description: 'Tăng Cholesterol máu gia đình', default: false })
  @IsOptional()
  @IsBoolean({ message: 'hasFamilialHypercholesterolemia must be a boolean' })
  hasFamilialHypercholesterolemia?: boolean;

  @ApiPropertyOptional({ description: 'Form Snapshot JSON' })
  @IsOptional()
  @IsObject()
  formSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional({
    enum: AssessmentStatus,
    enumName: 'AssessmentStatus',
    default: AssessmentStatus.SUBMITTED,
  })
  @IsOptional()
  @IsEnum(AssessmentStatus, { message: 'status must be a valid AssessmentStatus' })
  status?: AssessmentStatus;
}
