import { BaseEntity } from '@/commons/entities/base.entity';
import { VnDoctorRiskLevel } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, Relation } from 'typeorm';
import { RiskFactorAssessmentInput } from './risk-factor-assessment-input.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';

/**
 * Entity representing result & doctor conclusion for Cardiovascular Risk Factor Assessment.
 */
@Entity('risk_factor_assessment_results')
@Index('risk_factor_assessment_results_index_13', ['doctorId'])
@Index('risk_factor_assessment_results_index_14', ['riskLevel'])
@Index('risk_factor_assessment_results_index_15', ['evaluatedAt'])
export class RiskFactorAssessmentResult extends BaseEntity {
  @ApiProperty({ description: 'Assessment Input ID (1-to-1)' })
  @Column({ type: 'uuid', unique: true })
  assessmentInputId: string;

  @OneToOne(() => RiskFactorAssessmentInput, (input: RiskFactorAssessmentInput) => input.assessmentResult, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentInputId' })
  assessmentInput: Relation<RiskFactorAssessmentInput>;

  @ApiPropertyOptional({ description: 'Evaluating Doctor ID' })
  @Column({ type: 'uuid', nullable: true })
  doctorId?: string | null;

  @ManyToOne(() => StaffUser, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'doctorId' })
  doctor?: Relation<StaffUser> | null;

  @ApiPropertyOptional({ description: 'Calculated 10-year risk score (%)', example: 7.5 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  riskScore?: number | null;

  @ApiPropertyOptional({ enum: VnDoctorRiskLevel, enumName: 'VnDoctorRiskLevel' })
  @Column({ type: 'enum', enum: VnDoctorRiskLevel, nullable: true })
  riskLevel?: VnDoctorRiskLevel | null;

  @ApiPropertyOptional({ description: 'Doctor diagnostic conclusion' })
  @Column({ type: 'text', nullable: true })
  conclusion?: string | null;

  @ApiPropertyOptional({ description: 'Doctor treatment & lifestyle recommendations' })
  @Column({ type: 'text', nullable: true })
  recommendations?: string | null;

  @ApiProperty({ description: 'Evaluation completion timestamp' })
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  evaluatedAt: Date;
}
