import { CarePackageStatus, CarePackageType } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new Care Package by Facility Admin
 */
export class CreateCarePackageDto {
  @ApiPropertyOptional({
    description: 'Facility ID (Optional if staff is authenticated, defaults to staff facilityId)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID('4', { message: 'facilityId must be a valid UUID' })
  facilityId?: string;

  @ApiProperty({
    description: 'Unique care package code',
    example: 'PKG-CARDIO-30D',
  })
  @IsNotEmpty({ message: 'Code is required' })
  @IsString({ message: 'Code must be a string' })
  @MaxLength(50, { message: 'Code cannot exceed 50 characters' })
  code: string;

  @ApiProperty({
    description: 'Care package name',
    example: 'Gói Chăm Sóc Tim Mạch 30 Ngày',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({
    enum: CarePackageType,
    enumName: 'CarePackageType',
    description: 'Care package classification type (STANDARD / VIP)',
    default: CarePackageType.STANDARD,
  })
  @IsOptional()
  @IsEnum(CarePackageType, { message: 'Type must be STANDARD or VIP' })
  type?: CarePackageType;

  @ApiPropertyOptional({
    description: 'Detailed description and benefits',
    example: 'Theo dõi chỉ số huyết áp và kết nối bác sĩ tim mạch hàng tuần.',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiProperty({
    description: 'Duration in days',
    example: 30,
  })
  @IsNotEmpty({ message: 'Duration days is required' })
  @IsInt({ message: 'Duration days must be an integer' })
  @Min(1, { message: 'Duration must be at least 1 day' })
  @Type(() => Number)
  durationDays: number;

  @ApiProperty({
    description: 'Price amount in VND',
    example: 1500000,
  })
  @IsNotEmpty({ message: 'Price amount is required' })
  @IsNumber({}, { message: 'Price amount must be a number' })
  @Min(0, { message: 'Price amount cannot be negative' })
  @Type(() => Number)
  priceAmount: number;

  @ApiPropertyOptional({
    enum: CarePackageStatus,
    enumName: 'CarePackageStatus',
    description: 'Package status (ACTIVE / INACTIVE)',
    default: CarePackageStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CarePackageStatus, { message: 'Status must be ACTIVE or INACTIVE' })
  status?: CarePackageStatus;
}
