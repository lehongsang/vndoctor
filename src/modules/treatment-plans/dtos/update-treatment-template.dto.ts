import { PartialType } from '@nestjs/swagger';
import { CreateTreatmentTemplateDto } from './create-treatment-template.dto';

export class UpdateTreatmentTemplateDto extends PartialType(CreateTreatmentTemplateDto) {}
