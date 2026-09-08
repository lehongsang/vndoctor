import { BaseEntity } from '@/commons/entities/base.entity';
import {
  ProfileBloodType,
  ProfileGender,
  ProfileRelationship,
} from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, Relation } from 'typeorm';
import { Account } from '@/modules/accounts/entities/account.entity';
import { ProfileChronicDisease } from '@/modules/chronic-diseases/entities/profile-chronic-disease.entity';
import { FacilityPatientLink } from '@/modules/patient-links/entities/facility-patient-link.entity';
import { HealthRecord } from '@/modules/health-records/entities/health-record.entity';
import { Examination } from '@/modules/examinations/entities/examination.entity';
import { RiskFactorAssessmentInput } from '@/modules/risk-assessments/entities/risk-factor-assessment-input.entity';
import { PatientTreatmentTarget } from '@/modules/treatment-targets/entities/patient-treatment-target.entity';
import { TreatmentPlan } from '@/modules/treatment-plans/entities/treatment-plan.entity';

/**
 * Entity representing a Health Profile belonging to an App Account.
 */
@Entity('health_profiles')
export class HealthProfile extends BaseEntity {
  @ApiProperty({ description: 'Owning Account ID' })
  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, (account: Account) => account.healthProfiles, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountId' })
  account: Relation<Account>;

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

  @OneToOne(() => ProfileChronicDisease, (pcd: ProfileChronicDisease) => pcd.healthProfile, { cascade: true })
  profileChronicDisease?: Relation<ProfileChronicDisease>;

  @OneToMany(() => FacilityPatientLink, (link: FacilityPatientLink) => link.healthProfile)
  facilityLinks: Relation<FacilityPatientLink>[];

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
}
