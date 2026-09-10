import { PartialType } from '@nestjs/swagger';
import { CreateFacilityDto } from './create-facility.dto';

/**
 * DTO updating facility details.
 */
export class UpdateFacilityDto extends PartialType(CreateFacilityDto) {}
