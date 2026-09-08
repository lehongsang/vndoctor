import { BaseEntity } from '@/commons/entities/base.entity';
import { VnDoctorPlanStatus } from '@/commons/enums/vndoctor.enum';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { PatientTreatmentTarget } from '@/modules/treatment-targets/entities/patient-treatment-target.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

/**
 * Entity representing personalized Treatment Plan for a patient.
 */
@Entity('treatment_plans')
export class TreatmentPlan extends BaseEntity {
  @ApiProperty({ description: 'Unique treatment plan code (TP-YYYY-XXXXX)', example: 'TP-2026-00001' })
  @Column({ type: 'varchar', length: 50, unique: true })
  planCode: string;

  @ApiProperty({ description: 'Health Profile ID of patient', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @Column({ type: 'uuid' })
  healthProfileId: string;

  @ManyToOne(() => HealthProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'health_profile_id' })
  healthProfile?: HealthProfile;

  @ApiProperty({ description: 'Staff Doctor ID in charge of this plan', example: 'f901ab23-1122-3344-5566-778899aabbcc' })
  @Column({ type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => StaffUser, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctor_id' })
  doctor?: StaffUser;

  @ApiPropertyOptional({ description: 'Associated treatment target ID' })
  @Column({ type: 'uuid', nullable: true })
  treatmentTargetId?: string | null;

  @ManyToOne(() => PatientTreatmentTarget, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'treatment_target_id' })
  treatmentTarget?: PatientTreatmentTarget | null;

  @ApiProperty({ description: 'Title of treatment plan', example: 'Phác đồ điều trị Tăng huyết áp 3 tháng' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ description: 'Start date of treatment plan', example: '2026-09-08' })
  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  startDate: string;

  @ApiPropertyOptional({ description: 'Estimated or actual end date of plan', example: '2026-12-08' })
  @Column({ type: 'date', nullable: true })
  endDate?: string | null;

  @ApiPropertyOptional({ description: 'Doctor clinical notes, instructions, and prescriptions' })
  @Column({ type: 'text', nullable: true })
  doctorNotes?: string | null;

  @ApiProperty({ enum: VnDoctorPlanStatus, default: VnDoctorPlanStatus.ACTIVE })
  @Column({
    type: 'enum',
    enum: VnDoctorPlanStatus,
    default: VnDoctorPlanStatus.ACTIVE,
  })
  status: VnDoctorPlanStatus;
}
