import { BaseEntity } from '@/commons/entities/base.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, OneToOne, Relation } from 'typeorm';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';

/**
 * Entity holding selected chronic disease IDs for a specific health profile.
 */
@Entity('profile_chronic_diseases')
export class ProfileChronicDisease extends BaseEntity {
  @ApiProperty({ description: 'Health Profile ID' })
  @Column({ type: 'uuid', unique: true })
  healthProfileId: string;

  @OneToOne(() => HealthProfile, (profile: HealthProfile) => profile.profileChronicDisease, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'healthProfileId' })
  healthProfile: Relation<HealthProfile>;

  @ApiPropertyOptional({ description: 'Array of Chronic Disease UUIDs', example: ['b5368a52-9df7-4632-9cb9-4a9a838561d5'] })
  @Column('uuid', { array: true, default: '{}' })
  diseaseIds: string[];
}
