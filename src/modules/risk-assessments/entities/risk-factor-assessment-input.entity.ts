import { BaseEntity } from '@/commons/entities/base.entity';
import { AssessmentStatus } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, Relation } from 'typeorm';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { RiskFactorAssessmentResult } from './risk-factor-assessment-result.entity';
import { DecimalTransformer } from '@/utils/typeorm-transformers';

/**
 * Entity representing input clinical metrics for Cardiovascular/Metabolic Risk Factor Assessment.
 * Hỗ trợ 2 luồng: Không có bệnh nền (SCORE2 6 chỉ số) & Có bệnh nền (Tổn thương cơ quan đích & Bệnh lý mạn tính).
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

  // ==========================================
  // KHỐI 1: 6 CHỈ SỐ SINH LÝ CƠ BẢN (SCORE2)
  // ==========================================

  @ApiPropertyOptional({ description: 'Age at assessment', example: 45 })
  @Column({ type: 'int', nullable: true })
  age?: number | null;

  @ApiPropertyOptional({ description: 'Gender', example: 'Nam' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  gender?: string | null;

  @ApiProperty({ description: 'Is current smoker', default: false })
  @Column({ type: 'boolean', default: false })
  isSmoking: boolean;

  @ApiPropertyOptional({ description: 'Systolic blood pressure (mmHg)', example: 145 })
  @Column({ type: 'int', nullable: true })
  systolicBp?: number | null;

  @ApiPropertyOptional({ description: 'Diastolic blood pressure (mmHg)', example: 85 })
  @Column({ type: 'int', nullable: true })
  diastolicBp?: number | null;

  @ApiPropertyOptional({ description: 'Total Cholesterol (mmol/L)', example: 5.2 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: DecimalTransformer })
  totalCholesterol?: number | null;

  @ApiPropertyOptional({ description: 'HDL Cholesterol (mmol/L)', example: 1.2 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: DecimalTransformer })
  hdlCholesterol?: number | null;

  @ApiPropertyOptional({ description: 'LDL Cholesterol (mmol/L)', example: 3.4 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: DecimalTransformer })
  ldlCholesterol?: number | null;

  @ApiPropertyOptional({ description: 'Triglycerides (mmol/L)', example: 2.1 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: DecimalTransformer })
  triglycerides?: number | null;

  @ApiPropertyOptional({ description: 'Fasting Blood Glucose (mmol/L)', example: 6.5 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: DecimalTransformer })
  glucoseFasting?: number | null;

  @ApiPropertyOptional({ description: 'Height in cm', example: 168.0 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: DecimalTransformer })
  heightCm?: number | null;

  @ApiPropertyOptional({ description: 'Weight in kg', example: 65.5 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: DecimalTransformer })
  weightKg?: number | null;

  @ApiPropertyOptional({ description: 'Body Mass Index', example: 23.2 })
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true, transformer: DecimalTransformer })
  bmi?: number | null;

  // ==========================================
  // KHỐI 2: TỔN THƯƠNG CƠ QUAN ĐÍCH
  // ==========================================

  @ApiProperty({ description: 'Has left ventricular hypertrophy', default: false })
  @Column({ type: 'boolean', default: false })
  hasLeftVentricularHypertrophy: boolean;

  @ApiProperty({ description: 'Has albuminuria or microalbuminuria', default: false })
  @Column({ type: 'boolean', default: false })
  hasAlbuminuria: boolean;

  @ApiProperty({ description: 'Has retinopathy or carotid wall damage', default: false })
  @Column({ type: 'boolean', default: false })
  hasRetinopathy: boolean;

  @ApiProperty({ description: 'Has silent brain infarct', default: false })
  @Column({ type: 'boolean', default: false })
  hasSilentBrainInfarct: boolean;

  // ==========================================
  // KHỐI 3: BỆNH LÝ MẠN TÍNH & BIẾN CHỨNG
  // ==========================================

  @ApiPropertyOptional({ description: 'eGFR (Estimated Glomerular Filtration Rate) mL/min/1.73m2', example: 75.5 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: DecimalTransformer })
  egfr?: number | null;

  @ApiPropertyOptional({ description: 'ACR (Albumin-to-Creatinine Ratio) mg/g', example: 35.2 })
  @Column({ type: 'decimal', precision: 7, scale: 2, nullable: true, transformer: DecimalTransformer })
  acr?: number | null;

  @ApiPropertyOptional({ description: 'Has diabetes mellitus', default: false })
  @Column({ type: 'boolean', default: false })
  diabetes?: boolean;

  @ApiPropertyOptional({ description: 'Years diagnosed with diabetes', example: 10 })
  @Column({ type: 'int', nullable: true })
  diabetesDurationYears?: number | null;

  @ApiPropertyOptional({ description: 'Glycemic control level (Tốt / Không tốt)', example: 'Tốt' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  glycemicControl?: string | null;

  @ApiPropertyOptional({ description: 'History of Stroke / CVA', default: false })
  @Column({ type: 'boolean', default: false })
  stroke?: boolean;

  @ApiPropertyOptional({ description: 'Myocardial Infarction', default: false })
  @Column({ type: 'boolean', default: false })
  hasMyocardialInfarction?: boolean;

  @ApiPropertyOptional({ description: 'Acute Coronary Syndrome', default: false })
  @Column({ type: 'boolean', default: false })
  hasAcuteCoronarySyndrome?: boolean;

  @ApiPropertyOptional({ description: 'Coronary Artery Disease', default: false })
  @Column({ type: 'boolean', default: false })
  hasCoronaryArteryDisease?: boolean;

  @ApiPropertyOptional({ description: 'Transient Ischemic Attack (TIA)', default: false })
  @Column({ type: 'boolean', default: false })
  hasTia?: boolean;

  @ApiPropertyOptional({ description: 'Aortic Aneurysm', default: false })
  @Column({ type: 'boolean', default: false })
  hasAorticAneurysm?: boolean;

  @ApiPropertyOptional({ description: 'Peripheral Artery Disease', default: false })
  @Column({ type: 'boolean', default: false })
  hasPeripheralArteryDisease?: boolean;

  @ApiPropertyOptional({ description: 'Atherosclerosis of major arteries', default: false })
  @Column({ type: 'boolean', default: false })
  hasAtherosclerosis?: boolean;

  @ApiPropertyOptional({ description: 'Familial Hypercholesterolemia', default: false })
  @Column({ type: 'boolean', default: false })
  hasFamilialHypercholesterolemia?: boolean;

  // ==========================================
  // FORM SNAPSHOT & METADATA
  // ==========================================

  @ApiPropertyOptional({ description: 'JSON Snapshot of the dynamic form and submission payload' })
  @Column({ type: 'jsonb', nullable: true })
  formSnapshot?: Record<string, unknown> | null;

  @ApiProperty({ enum: AssessmentStatus, enumName: 'AssessmentStatus', default: AssessmentStatus.SUBMITTED })
  @Column({ type: 'enum', enum: AssessmentStatus, default: AssessmentStatus.SUBMITTED })
  status: AssessmentStatus;

  @ApiProperty({ description: 'Assessment date' })
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  assessmentDate: Date;

  @OneToOne(() => RiskFactorAssessmentResult, (result: RiskFactorAssessmentResult) => result.assessmentInput, { cascade: true })
  assessmentResult?: Relation<RiskFactorAssessmentResult>;
}
