import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateChronicDiseaseDto } from './create-chronic-disease.dto';

export class UpdateChronicDiseaseDto extends PartialType(
  OmitType(CreateChronicDiseaseDto, ['code'] as const),
) {}
