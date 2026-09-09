import { BaseEntity } from '@/commons/entities/base.entity';
import { CareSubscriptionStatus } from '@/commons/enums/vndoctor.enum';
import { CarePackage } from '@/modules/care-packages/entities/care-package.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';

/**
 * Entity representing a Patient Care Subscription to a Medical Care Package.
 */
@Entity('patient_care_subscriptions')
@Index('care_subscriptions_index_health_profile_id', ['healthProfileId'])
@Index('care_subscriptions_index_care_package_id', ['carePackageId'])
@Index('care_subscriptions_index_status', ['status'])
@Index('care_subscriptions_index_assigned_doctor_id', ['assignedDoctorId'])
@Index('care_subscriptions_index_assigned_nurse_id', ['assignedNurseId'])
export class PatientCareSubscription extends BaseEntity {
  @ApiProperty({
    description: 'ID of the Health Profile subscribing to the package',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @Column({ type: 'uuid', name: 'health_profile_id' })
  healthProfileId: string;

  @ManyToOne(() => HealthProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'health_profile_id' })
  healthProfile?: Relation<HealthProfile>;

  @ApiProperty({
    description: 'ID of the Care Package registered',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @Column({ type: 'uuid', name: 'care_package_id' })
  carePackageId: string;

  @ManyToOne(() => CarePackage, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'care_package_id' })
  carePackage?: Relation<CarePackage>;

  @ApiPropertyOptional({
    description: 'ID of the Primary Attending Doctor (users.id)',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @Column({ type: 'uuid', nullable: true, name: 'assigned_doctor_id' })
  assignedDoctorId?: string | null;

  @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_doctor_id' })
  assignedDoctor?: Relation<StaffUser> | null;

  @ApiPropertyOptional({
    description: 'ID of the Assigned Support Nurse (users.id)',
    example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  })
  @Column({ type: 'uuid', nullable: true, name: 'assigned_nurse_id' })
  assignedNurseId?: string | null;

  @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_nurse_id' })
  assignedNurse?: Relation<StaffUser> | null;

  @ApiPropertyOptional({
    description: 'ID of the Specialist / Expert Doctor for VIP packages (users.id)',
    example: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
  })
  @Column({ type: 'uuid', nullable: true, name: 'assigned_expert_id' })
  assignedExpertId?: string | null;

  @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_expert_id' })
  assignedExpert?: Relation<StaffUser> | null;

  @ApiProperty({
    enum: CareSubscriptionStatus,
    enumName: 'CareSubscriptionStatus',
    description: 'Trạng thái gói chăm sóc: PENDING / ACTIVE / EXPIRED / CANCELLED',
    default: CareSubscriptionStatus.PENDING,
  })
  @Column({
    type: 'enum',
    enum: CareSubscriptionStatus,
    default: CareSubscriptionStatus.PENDING,
  })
  status: CareSubscriptionStatus;

  @ApiPropertyOptional({
    description: 'Thời điểm kích hoạt gói chăm sóc',
    example: '2026-03-01T08:00:00Z',
  })
  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  startedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Thời điểm hết hạn gói chăm sóc',
    example: '2026-03-31T23:59:59Z',
  })
  @Column({ type: 'timestamptz', nullable: true, name: 'expires_at' })
  expiresAt?: Date | null;
}
