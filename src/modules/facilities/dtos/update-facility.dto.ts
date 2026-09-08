import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateFacilityDto } from './create-facility.dto';

/**
 * DTO updating facility details.
 * Reuses CreateFacilityDto omitting non-updatable unique facilityCode.
 */
export class UpdateFacilityDto extends PartialType(
  OmitType(CreateFacilityDto, ['facilityCode'] as const),
) {}
