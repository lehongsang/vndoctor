import { BaseEntity } from '@/commons/entities/base.entity';
import { FacilityPatientLinkStatus } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';

/**
 * Entity representing the link between a Medical Facility and a Patient Health Profile.
 */
@Entity('facility_patient_links')
@Index('facility_patient_links_index_6', ['facilityId', 'healthProfileId'], { unique: true })
export class FacilityPatientLink extends BaseEntity {
  @ApiProperty({ description: 'Facility ID' })
  @Column({ type: 'uuid' })
  facilityId: string;

  @ManyToOne(() => Facility, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'facilityId' })
  facility: Facility;

  @ApiProperty({ description: 'Health Profile ID on Mobile App' })
  @Column({ type: 'uuid' })
  healthProfileId: string;

  @ManyToOne(() => HealthProfile, (profile) => profile.facilityLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'healthProfileId' })
  healthProfile: HealthProfile;

  @ApiProperty({ description: 'Phone number used for lookup & linking' })
  @Index('facility_patient_links_index_7', ['facilityId', 'phoneNumber'])
  @Index('facility_patient_links_index_8')
  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Hospital internal patient code (Mã BN)' })
  @Index('facility_patient_links_index_9')
  @Column({ type: 'varchar', length: 50, nullable: true })
  hospitalPatientCode?: string | null;

  @ApiProperty({ enum: FacilityPatientLinkStatus, enumName: 'FacilityPatientLinkStatus', default: FacilityPatientLinkStatus.ACTIVE })
  @Column({ type: 'enum', enum: FacilityPatientLinkStatus, default: FacilityPatientLinkStatus.ACTIVE })
  status: FacilityPatientLinkStatus;

  @ApiProperty({ description: 'Timestamp when linking was activated' })
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  linkedAt: Date;
}
