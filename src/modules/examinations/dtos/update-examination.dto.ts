import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateExaminationDto } from './create-examination.dto';

/**
 * DTO for updating an existing medical examination record.
 */
export class UpdateExaminationDto extends PartialType(
  OmitType(CreateExaminationDto, ['healthProfileId', 'facilityId'] as const),
) {}
