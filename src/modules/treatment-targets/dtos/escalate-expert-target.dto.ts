import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class EscalateExpertTargetDto {
  @ApiPropertyOptional({
    description: 'ID của Bác sĩ Chuyên gia được chuyển tiếp (nếu muốn chỉ định cụ thể khác với gói)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  @IsOptional()
  expertId?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú lý do chuyển tiếp sang Bác sĩ Chuyên gia',
    example: 'Bệnh nhân có nhiều bệnh nền phối hợp, đề nghị chuyên gia tim mạch cho ý kiến về đích LDL-C',
  })
  @IsString()
  @IsOptional()
  doctorNotes?: string;
}
