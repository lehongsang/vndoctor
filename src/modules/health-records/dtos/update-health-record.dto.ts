import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateHealthRecordDto } from './create-health-record.dto';

/**
 * DTO for updating an existing health record measurement.
 */
export class UpdateHealthRecordDto extends PartialType(
  OmitType(CreateHealthRecordDto, ['healthProfileId'] as const),
) {}
