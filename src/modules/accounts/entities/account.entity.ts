import { BaseEntity } from '@/commons/entities/base.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, OneToMany } from 'typeorm';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';

/**
 * Entity representing a Patient Mobile App Account.
 */
@Entity('accounts')
export class Account extends BaseEntity {
  @ApiProperty({ description: 'Primary phone number used for login', example: '0987654321' })
  @Column({ type: 'varchar', length: 20, unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @ApiPropertyOptional({ description: 'Optional email address', example: 'patient@gmail.com' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @ApiProperty({ description: 'Is active account', default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => HealthProfile, (profile: HealthProfile) => profile.account)
  healthProfiles: HealthProfile[];
}
