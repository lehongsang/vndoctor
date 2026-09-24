import { BaseEntity } from '@/commons/entities/base.entity';
import {
  FacilityPatientLinkStatus,
  ProfileBloodType,
  ProfileGender,
  ProfileRelationship,
} from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Relation } from 'typeorm';
import { Account } from '@/modules/accounts/entities/account.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { DecimalTransformer } from '@/utils/typeorm-transformers';
import { HealthRecord } from '@/modules/health-records/entities/health-record.entity';
import { Examination } from '@/modules/examinations/entities/examination.entity';
import { RiskFactorAssessmentInput } from '@/modules/risk-assessments/entities/risk-factor-assessment-input.entity';
import { PatientTreatmentTarget } from '@/modules/treatment-targets/entities/patient-treatment-target.entity';
import { TreatmentPlan } from '@/modules/treatment-plans/entities/treatment-plan.entity';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';

/**
 * Entity representing a Health Profile belonging to an App Account or Medical Facility.
 */
@Entity('health_profiles')
export class HealthProfile extends BaseEntity {
  @ApiPropertyOptional({ description: 'Owning Account ID (nullable if created independently by medical facility)' })
  @Index('health_profiles_index_account_id')
  @Column({ type: 'uuid', nullable: true })
  accountId?: string | null;

  @ManyToOne(() => Account, (account: Account) => account.healthProfiles, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accountId' })
  account?: Relation<Account>;

  @ApiPropertyOptional({ description: 'ID cơ sở y tế quản lý hồ sơ (nullable nếu chưa liên kết với CSYT nào)' })
  @Index('health_profiles_index_facility_id')
  @Column({ type: 'uuid', nullable: true })
  facilityId?: string | null;

  @ManyToOne(() => Facility, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'facilityId' })
  facility?: Relation<Facility>;

  @ApiProperty({ description: 'Trạng thái đã liên kết thành công giữa Cơ sở y tế và Tài khoản App', default: false })
  @Column({ type: 'boolean', default: false })
  isLinked: boolean;

  @ApiProperty({
    enum: FacilityPatientLinkStatus,
    enumName: 'FacilityPatientLinkStatus',
    description: 'Trạng thái liên kết tại cơ sở y tế (NOT_LINKED, PENDING, ACTIVE, UNLINKED)',
    default: FacilityPatientLinkStatus.NOT_LINKED,
  })
  @Column({
    type: 'enum',
    enum: FacilityPatientLinkStatus,
    default: FacilityPatientLinkStatus.NOT_LINKED,
  })
  linkStatus: FacilityPatientLinkStatus;

  @ApiPropertyOptional({
    description: 'Mã bệnh nhân nội bộ tại viện (hệ thống tự sinh hoặc viện cấp)',
    example: 'BN-20260916-A1B2',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  hospitalPatientCode?: string | null;

  @ApiPropertyOptional({ description: 'Thời điểm liên kết được kích hoạt' })
  @Column({ type: 'timestamptz', nullable: true })
  linkedAt?: Date | null;

  @ApiProperty({ enum: ProfileRelationship, enumName: 'ProfileRelationship', default: ProfileRelationship.SELF })
  @Index('health_profiles_index_3')
  @Column({ type: 'enum', enum: ProfileRelationship, default: ProfileRelationship.SELF })
  relationship: ProfileRelationship;

  @ApiProperty({ description: 'Full legal name', example: 'Trần Thị Mai' })
  @Index('health_profiles_index_5')
  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @ApiProperty({ description: 'Date of birth (YYYY-MM-DD)', example: '1985-05-20' })
  @Column({ type: 'date' })
  dob: string;

  @ApiProperty({ enum: ProfileGender, enumName: 'ProfileGender' })
  @Column({ type: 'enum', enum: ProfileGender })
  gender: ProfileGender;

  @ApiPropertyOptional({ description: 'Citizen Identification Card (CCCD 12 digits)', example: '079185001234' })
  @Index('health_profiles_index_4')
  @Column({ type: 'varchar', length: 12, nullable: true })
  citizenId?: string | null;

  @ApiPropertyOptional({ description: 'Contact phone number for this profile', example: '0987654321' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string | null;

  @ApiPropertyOptional({ description: 'Residential address' })
  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @ApiPropertyOptional({ enum: ProfileBloodType, enumName: 'ProfileBloodType', default: ProfileBloodType.UNKNOWN })
  @Column({ type: 'enum', enum: ProfileBloodType, default: ProfileBloodType.UNKNOWN })
  bloodType: ProfileBloodType;

  @ApiPropertyOptional({ description: 'Known allergies (drugs, food, etc.)' })
  @Column({ type: 'text', nullable: true })
  allergy?: string | null;

  @ApiPropertyOptional({ description: 'Personal and family medical history' })
  @Column({ type: 'text', nullable: true })
  medicalHistory?: string | null;

  @ApiPropertyOptional({ description: 'Chiều cao (cm)', example: 170.0 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: DecimalTransformer })
  height?: number | null;

  @ApiPropertyOptional({ description: 'Cân nặng (kg)', example: 65.0 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: DecimalTransformer })
  weight?: number | null;

  @ApiPropertyOptional({ description: 'Có hút thuốc lá hay không', default: false, example: false })
  @Column({ type: 'boolean', default: false })
  isSmoking: boolean;

  @ApiPropertyOptional({ description: 'Có bị bệnh tăng huyết áp không', default: false, example: false })
  @Column({ type: 'boolean', default: false })
  hasHypertension: boolean;

  @ApiPropertyOptional({ description: 'Có bị mỡ máu / rối loạn lipid máu không', default: false, example: false })
  @Column({ type: 'boolean', default: false })
  hasDyslipidemia: boolean;

  @ApiPropertyOptional({ description: 'Có bị đái tháo đường không', default: false, example: false })
  @Column({ type: 'boolean', default: false })
  hasDiabetes: boolean;

  @ApiPropertyOptional({ description: 'Tiền sử đột quỵ não / Tai biến', default: false, example: false })
  @Column({ type: 'boolean', default: false })
  hasStroke: boolean;

  @ApiPropertyOptional({ description: 'Nhồi máu cơ tim', default: false, example: false })
  @Column({ type: 'boolean', default: false })
  hasMyocardialInfarction: boolean;

  @ApiPropertyOptional({ description: 'Hội chứng vành cấp', default: false, example: false })
  @Column({ type: 'boolean', default: false })
  hasAcuteCoronarySyndrome: boolean;

  @ApiPropertyOptional({ description: 'Bệnh lý động mạch vành mạn', default: false, example: false })
  @Column({ type: 'boolean', default: false })
  hasCoronaryArteryDisease: boolean;

  @ApiPropertyOptional({ description: 'Cơn thiếu máu não thoáng qua (TIA)', default: false, example: false })
  @Column({ type: 'boolean', default: false })
  hasTia: boolean;

  @ApiPropertyOptional({ description: 'Phình động mạch chủ', default: false, example: false })
  @Column({ type: 'boolean', default: false })
  hasAorticAneurysm: boolean;

  @ApiPropertyOptional({ description: 'Bệnh mạch máu ngoại vi', default: false, example: false })
  @Column({ type: 'boolean', default: false })
  hasPeripheralArteryDisease: boolean;

  @ApiPropertyOptional({ description: 'Vữa xơ mạch máu lớn', default: false, example: false })
  @Column({ type: 'boolean', default: false })
  hasAtherosclerosis: boolean;

  @ApiPropertyOptional({ description: 'Tăng Cholesterol máu gia đình', default: false, example: false })
  @Column({ type: 'boolean', default: false })
  hasFamilialHypercholesterolemia: boolean;

  @OneToMany(() => HealthRecord, (record: HealthRecord) => record.healthProfile)
  healthRecords: Relation<HealthRecord>[];

  @OneToMany(() => Examination, (exam: Examination) => exam.healthProfile)
  examinations: Relation<Examination>[];

  @OneToMany(() => RiskFactorAssessmentInput, (assessment: RiskFactorAssessmentInput) => assessment.healthProfile)
  riskAssessments: Relation<RiskFactorAssessmentInput>[];

  @OneToMany(() => PatientTreatmentTarget, (target: PatientTreatmentTarget) => target.healthProfile)
  treatmentTargets: Relation<PatientTreatmentTarget>[];

  @OneToMany(() => TreatmentPlan, (plan: TreatmentPlan) => plan.healthProfile)
  treatmentPlans: Relation<TreatmentPlan>[];

  @OneToMany(() => PatientCareSubscription, (sub: PatientCareSubscription) => sub.healthProfile)
  careSubscriptions?: Relation<PatientCareSubscription>[];

  @ApiPropertyOptional({
    description: 'Thông tin gói chăm sóc và bác sĩ được phân công (nếu có)',
  })
  @Expose()
  subscription?: Record<string, unknown> | null;
}

