import { BaseEntity } from '@/commons/entities/base.entity';
import { PatientTargetStatus } from '@/commons/enums/vndoctor.enum';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';
import { Examination } from '@/modules/examinations/entities/examination.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { RiskFactorAssessmentResult } from '@/modules/risk-assessments/entities/risk-factor-assessment-result.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { TreatmentTargetDictionary } from '@/modules/treatment-dictionaries/entities/treatment-target-dictionary.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';

/**
 * Entity representing personalized Patient Treatment Target record.
 */
@Entity('patient_treatment_targets')
export class PatientTreatmentTarget extends BaseEntity {
  @ApiProperty({ description: 'Health Profile ID of patient', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @Column({ type: 'uuid', name: 'health_profile_id' })
  healthProfileId: string;

  @ManyToOne(() => HealthProfile, (profile: HealthProfile) => profile.treatmentTargets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'health_profile_id' })
  healthProfile?: Relation<HealthProfile>;

  @ApiPropertyOptional({ description: 'ID of active Care Subscription associated with this target' })
  @Column({ type: 'uuid', nullable: true, name: 'care_subscription_id' })
  careSubscriptionId?: string | null;

  @ManyToOne(() => PatientCareSubscription, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'care_subscription_id' })
  careSubscription?: Relation<PatientCareSubscription> | null;

  @ApiPropertyOptional({ description: 'Primary Attending Doctor ID', example: 'f901ab23-1122-3344-5566-778899aabbcc' })
  @Column({ type: 'uuid', nullable: true, name: 'doctor_id' })
  doctorId?: string | null;

  @ManyToOne(() => StaffUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'doctor_id' })
  doctor?: Relation<StaffUser> | null;

  @ApiPropertyOptional({ description: 'Specialist / Expert Doctor ID (if escalated for second opinion)' })
  @Column({ type: 'uuid', nullable: true, name: 'expert_id' })
  expertId?: string | null;

  @ManyToOne(() => StaffUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'expert_id' })
  expert?: Relation<StaffUser> | null;

  @ApiPropertyOptional({ description: 'Associated Medical Examination ID (if linked)' })
  @Column({ type: 'uuid', nullable: true, name: 'examination_id' })
  examinationId?: string | null;

  @ManyToOne(() => Examination, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'examination_id' })
  examination?: Relation<Examination> | null;

  @ApiPropertyOptional({ description: 'Associated Risk Assessment Result ID (if linked)' })
  @Column({ type: 'uuid', nullable: true, name: 'assessment_result_id' })
  assessmentResultId?: string | null;

  @ManyToOne(() => RiskFactorAssessmentResult, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assessment_result_id' })
  assessmentResult?: Relation<RiskFactorAssessmentResult> | null;

  @ApiPropertyOptional({ description: 'Referenced target dictionary code (e.g. A1, B2, C1)', example: 'A1' })
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'dictionary_code' })
  dictionaryCode?: string | null;

  @ManyToOne(() => TreatmentTargetDictionary, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'dictionary_code' })
  dictionary?: Relation<TreatmentTargetDictionary> | null;

  @ApiPropertyOptional({ description: 'Target Blood Pressure', example: '< 130/80 mmHg' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  bpTarget?: string | null;

  @ApiPropertyOptional({ description: 'Target Lipid (LDL-C)', example: '< 1.8 mmol/L' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  lipidTarget?: string | null;

  @ApiPropertyOptional({ description: 'Target BMI / Weight', example: 'BMI 20 - 22.9 kg/m2' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  bmiTarget?: string | null;

  @ApiPropertyOptional({ description: 'Target Glycemic / HbA1c', example: 'HbA1c < 7.0%' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  glycemicTarget?: string | null;

  @ApiPropertyOptional({ description: 'Target Renal / Kidney guidance' })
  @Column({ type: 'text', nullable: true })
  renalTarget?: string | null;

  @ApiPropertyOptional({ description: 'Dietary guidance' })
  @Column({ type: 'text', nullable: true })
  dietAdvice?: string | null;

  @ApiPropertyOptional({ description: 'Exercise guidance' })
  @Column({ type: 'text', nullable: true })
  exerciseAdvice?: string | null;

  @ApiPropertyOptional({ description: 'Smoking cessation advice' })
  @Column({ type: 'text', nullable: true })
  smokingAdvice?: string | null;

  @ApiPropertyOptional({ description: 'Primary Doctor clinical notes' })
  @Column({ type: 'text', nullable: true })
  doctorNotes?: string | null;

  @ApiPropertyOptional({ description: 'Specialist / Expert Doctor consultation notes' })
  @Column({ type: 'text', nullable: true })
  expertNotes?: string | null;

  @ApiProperty({
    enum: PatientTargetStatus,
    enumName: 'PatientTargetStatus',
    default: PatientTargetStatus.PENDING_REVIEW,
    description: 'Trạng thái: PENDING_REVIEW / DOCTOR_VERIFIED / ESCALATED_TO_EXPERT / EXPERT_VERIFIED / COMPLETED / CANCELLED',
  })
  @Column({
    type: 'enum',
    enum: PatientTargetStatus,
    default: PatientTargetStatus.PENDING_REVIEW,
  })
  status: PatientTargetStatus;

  @ApiPropertyOptional({ description: 'Verification timestamp by Doctor or Expert' })
  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt?: Date | null;
}
