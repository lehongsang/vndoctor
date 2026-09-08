import { BaseEntity } from '@/commons/entities/base.entity';
import { AssessmentStatus } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, Relation } from 'typeorm';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { RiskFactorAssessmentResult } from './risk-factor-assessment-result.entity';

/**
 * Entity representing input clinical metrics for Cardiovascular/Metabolic Risk Factor Assessment.
 */
@Entity('risk_factor_assessment_inputs')
@Index('risk_factor_assessment_inputs_index_10', ['healthProfileId', 'assessmentDate'])
@Index('risk_factor_assessment_inputs_index_11', ['facilityId'])
@Index('risk_factor_assessment_inputs_index_12', ['status'])
export class RiskFactorAssessmentInput extends BaseEntity {
  @ApiProperty({ description: 'Health Profile ID' })
  @Column({ type: 'uuid' })
  healthProfileId: string;

  @ManyToOne(() => HealthProfile, (profile: HealthProfile) => profile.riskAssessments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'healthProfileId' })
  healthProfile: Relation<HealthProfile>;

  @ApiPropertyOptional({ description: 'Facility ID if conducted in medical center' })
  @Column({ type: 'uuid', nullable: true })
  facilityId?: string | null;

  @ManyToOne(() => Facility, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'facilityId' })
  facility?: Relation<Facility> | null;

  @ApiProperty({ description: 'Has underlying disease flag', default: false })
  @Column({ type: 'boolean', default: false })
  hasUnderlyingDisease: boolean;

  @ApiPropertyOptional({ description: 'Array of Chronic Disease UUIDs' })
  @Column('uuid', { array: true, default: '{}' })
  chronicDiseaseIds: string[];

  @ApiProperty({ description: 'Has left ventricular hypertrophy', default: false })
  @Column({ type: 'boolean', default: false })
  hasLeftVentricularHypertrophy: boolean;

  @ApiProperty({ description: 'Has albuminuria', default: false })
  @Column({ type: 'boolean', default: false })
  hasAlbuminuria: boolean;

  @ApiProperty({ description: 'Has diabetic retinopathy', default: false })
  @Column({ type: 'boolean', default: false })
  hasRetinopathy: boolean;

  @ApiProperty({ description: 'Has silent brain infarct', default: false })
  @Column({ type: 'boolean', default: false })
  hasSilentBrainInfarct: boolean;

  @ApiPropertyOptional({ description: 'eGFR (Estimated Glomerular Filtration Rate) mL/min/1.73m2', example: 75.5 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  egfr?: number | null;

  @ApiPropertyOptional({ description: 'ACR (Albumin-to-Creatinine Ratio) mg/g', example: 35.2 })
  @Column({ type: 'decimal', precision: 7, scale: 2, nullable: true })
  acr?: number | null;

  @ApiPropertyOptional({ description: 'Height in cm', example: 168.0 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  heightCm?: number | null;

  @ApiPropertyOptional({ description: 'Weight in kg', example: 65.5 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weightKg?: number | null;

  @ApiPropertyOptional({ description: 'Body Mass Index', example: 23.2 })
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  bmi?: number | null;

  @ApiPropertyOptional({ description: 'Systolic blood pressure (mmHg)', example: 135 })
  @Column({ type: 'int', nullable: true })
  systolicBp?: number | null;

  @ApiPropertyOptional({ description: 'Diastolic blood pressure (mmHg)', example: 85 })
  @Column({ type: 'int', nullable: true })
  diastolicBp?: number | null;

  @ApiProperty({ description: 'Is current smoker', default: false })
  @Column({ type: 'boolean', default: false })
  isSmoking: boolean;

  @ApiPropertyOptional({ description: 'Total Cholesterol (mmol/L)', example: 5.2 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  totalCholesterol?: number | null;

  @ApiPropertyOptional({ description: 'HDL Cholesterol (mmol/L)', example: 1.2 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  hdlCholesterol?: number | null;

  @ApiPropertyOptional({ description: 'LDL Cholesterol (mmol/L)', example: 3.4 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  ldlCholesterol?: number | null;

  @ApiPropertyOptional({ description: 'Triglycerides (mmol/L)', example: 2.1 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  triglycerides?: number | null;

  @ApiPropertyOptional({ description: 'Fasting Blood Glucose (mmol/L)', example: 6.5 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  glucoseFasting?: number | null;

  @ApiProperty({ enum: AssessmentStatus, enumName: 'AssessmentStatus', default: AssessmentStatus.SUBMITTED })
  @Column({ type: 'enum', enum: AssessmentStatus, default: AssessmentStatus.SUBMITTED })
  status: AssessmentStatus;

  @ApiProperty({ description: 'Assessment date' })
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  assessmentDate: Date;

  @OneToOne(() => RiskFactorAssessmentResult, (result: RiskFactorAssessmentResult) => result.assessmentInput, { cascade: true })
  assessmentResult?: Relation<RiskFactorAssessmentResult>;
}
