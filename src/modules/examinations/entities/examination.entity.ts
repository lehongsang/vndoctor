import { BaseEntity } from '@/commons/entities/base.entity';
import { ExaminationStatus } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { RiskFactorAssessmentInput } from '@/modules/risk-assessments/entities/risk-factor-assessment-input.entity';

/**
 * Entity representing an Examination record (Phiếu khám bệnh).
 */
@Entity('examinations')
@Index('examinations_index_16', ['healthProfileId', 'examinationDate'])
@Index('examinations_index_17', ['doctorId'])
@Index('examinations_index_18', ['facilityId'])
@Index('examinations_index_19', ['status'])
@Index('examinations_index_20', ['examinationCode'])
export class Examination extends BaseEntity {
  @ApiProperty({ description: 'Unique examination code', example: 'EX-2026-0001' })
  @Column({ type: 'varchar', length: 50, unique: true })
  examinationCode: string;

  @ApiProperty({ description: 'Health Profile ID' })
  @Column({ type: 'uuid' })
  healthProfileId: string;

  @ManyToOne(() => HealthProfile, (profile) => profile.examinations, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'healthProfileId' })
  healthProfile: HealthProfile;

  @ApiProperty({ description: 'Attending Doctor ID' })
  @Column({ type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => StaffUser, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctorId' })
  doctor: StaffUser;

  @ApiProperty({ description: 'Facility ID' })
  @Column({ type: 'uuid' })
  facilityId: string;

  @ManyToOne(() => Facility, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'facilityId' })
  facility: Facility;

  @ApiPropertyOptional({ description: 'Linked Risk Factor Assessment Input ID' })
  @Column({ type: 'uuid', nullable: true })
  assessmentInputId?: string | null;

  @ManyToOne(() => RiskFactorAssessmentInput, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assessmentInputId' })
  assessmentInput?: RiskFactorAssessmentInput | null;

  @ApiPropertyOptional({ description: 'Heart rate (bpm)', example: 78 })
  @Column({ type: 'int', nullable: true })
  heartRate?: number | null;

  @ApiPropertyOptional({ description: 'Systolic blood pressure (mmHg)', example: 120 })
  @Column({ type: 'int', nullable: true })
  systolicBp?: number | null;

  @ApiPropertyOptional({ description: 'Diastolic blood pressure (mmHg)', example: 80 })
  @Column({ type: 'int', nullable: true })
  diastolicBp?: number | null;

  @ApiPropertyOptional({ description: 'Body temperature (°C)', example: 36.8 })
  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  temperature?: number | null;

  @ApiPropertyOptional({ description: 'Oxygen saturation SpO2 (%)', example: 98 })
  @Column({ type: 'int', nullable: true })
  spo2?: number | null;

  @ApiPropertyOptional({ description: 'Height (cm)', example: 170.0 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  heightCm?: number | null;

  @ApiPropertyOptional({ description: 'Weight (kg)', example: 68.0 })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weightKg?: number | null;

  @ApiPropertyOptional({ description: 'BMI', example: 23.5 })
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  bmi?: number | null;

  @ApiPropertyOptional({ description: 'Reason for visit' })
  @Column({ type: 'text', nullable: true })
  reasonForVisit?: string | null;

  @ApiPropertyOptional({ description: 'Clinical symptoms described' })
  @Column({ type: 'text', nullable: true })
  clinicalSymptoms?: string | null;

  @ApiProperty({ description: 'Main clinical diagnosis', example: 'Tăng huyết áp nguyên phát / Đái tháo đường Type 2' })
  @Column({ type: 'text' })
  diagnosis: string;

  @ApiPropertyOptional({ description: 'Primary ICD-10 Code', example: 'I10' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  icd10Code?: string | null;

  @ApiPropertyOptional({ description: 'Prescription & treatment plan summary' })
  @Column({ type: 'text', nullable: true })
  treatmentPlan?: string | null;

  @ApiPropertyOptional({ description: 'Follow-up appointment date (YYYY-MM-DD)' })
  @Column({ type: 'date', nullable: true })
  nextAppointmentDate?: string | null;

  @ApiProperty({ enum: ExaminationStatus, enumName: 'ExaminationStatus', default: ExaminationStatus.IN_PROGRESS })
  @Column({ type: 'enum', enum: ExaminationStatus, default: ExaminationStatus.IN_PROGRESS })
  status: ExaminationStatus;

  @ApiProperty({ description: 'Examination date' })
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  examinationDate: Date;
}
