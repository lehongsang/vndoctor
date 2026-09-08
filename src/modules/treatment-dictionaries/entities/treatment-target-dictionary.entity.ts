import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Entity representing medical Treatment Target Dictionary reference table (A1 -> G5).
 */
@Entity('treatment_target_dictionaries')
export class TreatmentTargetDictionary {
  @ApiProperty({ description: 'Dictionary code identifier (A1 -> G5)', example: 'A1' })
  @PrimaryColumn({ type: 'varchar', length: 20 })
  code: string;

  @ApiPropertyOptional({ description: 'Assessment clinical notes', example: 'Tích cực thay đổi lối sống...' })
  @Column({ type: 'text', nullable: true })
  assessmentNotes?: string | null;

  @ApiPropertyOptional({ description: 'Recommended follow-up timeframe', example: 'Theo dõi Định kỳ 6 tháng/lần' })
  @Column({ type: 'text', nullable: true })
  assessmentTimeframe?: string | null;

  @ApiPropertyOptional({ description: 'Blood pressure target guideline', example: '+ Huyết áp tâm thu: 120-129 mmHg' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  bpTarget?: string | null;

  @ApiPropertyOptional({ description: 'Lipid (LDL-C) target guideline', example: 'Đảm bảo mục tiêu LDL-C < 3.0 mmol/l' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  lipidTarget?: string | null;

  @ApiPropertyOptional({ description: 'BMI target guideline', example: 'BMI từ 20-23 tối ưu' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  bmiTarget?: string | null;

  @ApiPropertyOptional({ description: 'Glycemic target guideline', example: 'HbA1c < 7.0%' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  glycemicTarget?: string | null;

  @ApiPropertyOptional({ description: 'Renal target guideline', example: 'Xét nghiệm chức năng thận định kỳ' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  renalTarget?: string | null;

  @ApiPropertyOptional({ description: 'Dietary guidance' })
  @Column({ type: 'text', nullable: true })
  dietAdvice?: string | null;

  @ApiPropertyOptional({ description: 'Exercise and physical activity guidance' })
  @Column({ type: 'text', nullable: true })
  exerciseAdvice?: string | null;

  @ApiPropertyOptional({ description: 'Smoking cessation advice' })
  @Column({ type: 'text', nullable: true })
  smokingAdvice?: string | null;

  @ApiPropertyOptional({ description: 'General notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
