import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * DTO for doctor clinical evaluation & confirmation of risk factor assessment.
 * API này dùng để bác sĩ xác nhận phiếu phân tầng và đưa ra kết luận / lời khuyên chuyên môn.
 * Điểm nguy cơ (riskScore) và mức độ nguy cơ (riskLevel) được hệ thống bảo toàn theo chuẩn y khoa SCORE2/ESC.
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
}

