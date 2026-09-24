import { VnDoctorRiskLevel } from '@/commons/enums/vndoctor.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO for doctor clinical evaluation & confirmation of risk factor assessment.
 * API này dùng để bác sĩ xác nhận phiếu phân tầng và đưa ra kết luận / lời khuyên chuyên môn.
 */
export class EvaluateRiskAssessmentDto {
  @ApiPropertyOptional({
    description: 'Kết luận chẩn đoán chuyên môn của bác sĩ',
    example: 'Bệnh nhân có nguy cơ tim mạch rất cao do tăng huyết áp kèm đái tháo đường và tổn thương cơ quan đích',
  })
  @IsOptional()
  @IsString({ message: 'conclusion must be a string' })
  conclusion?: string;

  @ApiPropertyOptional({
    description: 'Lời khuyên, hướng dẫn lối sống và phác đồ điều trị của bác sĩ',
    example: 'Điều chỉnh lối sống, giảm muối, kiểm soát HbA1c < 7.0%, tái khám sau 1 tháng',
  })
  @IsOptional()
  @IsString({ message: 'recommendations must be a string' })
  recommendations?: string;

  @ApiPropertyOptional({
    enum: VnDoctorRiskLevel,
    enumName: 'VnDoctorRiskLevel',
    description: 'Mức độ nguy cơ do bác sĩ điều chỉnh (LOW / HIGH / VERY_HIGH)',
  })
  @IsOptional()
  @IsEnum(VnDoctorRiskLevel, { message: 'riskLevel must be a valid VnDoctorRiskLevel' })
  riskLevel?: VnDoctorRiskLevel;

  @ApiPropertyOptional({
    description: 'Điểm nguy cơ 10 năm (%) do bác sĩ điều chỉnh',
    example: 12.5,
  })
  @IsOptional()
  @IsNumber({}, { message: 'riskScore must be a number' })
  riskScore?: number;
}

