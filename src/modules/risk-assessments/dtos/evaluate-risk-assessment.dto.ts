import { VnDoctorRiskLevel } from '@/commons/enums/vndoctor.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * DTO for doctor clinical evaluation & confirmation of risk factor assessment.
 * API này dùng để bác sĩ xác nhận phiếu phân tầng và đưa ra kết luận / lời khuyên chuyên môn.
 */
export class EvaluateRiskAssessmentDto {
  @ApiPropertyOptional({
    description: 'Ghi chú / lời dặn của bác sĩ khi phân tầng hoặc tư vấn kết quả',
    example: 'Bệnh nhân có nguy cơ tim mạch rất cao do tăng huyết áp kèm đái tháo đường, cần tuân thủ dùng thuốc và tái khám sau 1 tháng',
  })
  @IsOptional()
  @IsString({ message: 'doctorNote must be a string' })
  doctorNote?: string;

  @ApiPropertyOptional({
    enum: VnDoctorRiskLevel,
    enumName: 'VnDoctorRiskLevel',
    description: 'Mức độ nguy cơ do bác sĩ điều chỉnh (LOW / HIGH / VERY_HIGH)',
  })
  @IsOptional()
  @IsEnum(VnDoctorRiskLevel, { message: 'riskLevel must be a valid VnDoctorRiskLevel' })
  riskLevel?: VnDoctorRiskLevel;
}

