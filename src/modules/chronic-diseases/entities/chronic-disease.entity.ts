import { BaseEntity } from '@/commons/entities/base.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';

/**
 * Entity representing master catalogue of Chronic Diseases.
 */
@Entity('chronic_diseases')
export class ChronicDisease extends BaseEntity {
  @ApiProperty({ description: 'Unique code of disease (e.g., DIABETES, HYPERTENSION)', example: 'DIABETES' })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @ApiProperty({ description: 'Full name of disease', example: 'Đái tháo đường Type 2' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional({ description: 'ICD-10 code', example: 'E11' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  icd10Code?: string | null;

  @ApiPropertyOptional({ description: 'Category (Tim mạch, Chuyển hóa...)', example: 'Chuyển hóa' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string | null;

  @ApiProperty({ description: 'Active status', default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Display order in list', default: 0 })
  @Column({ type: 'int', default: 0 })
  displayOrder: number;
}
