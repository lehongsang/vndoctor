import { PartialType } from '@nestjs/swagger';
import { CreatePatientTargetDto } from './create-patient-target.dto';

export class UpdatePatientTargetDto extends PartialType(CreatePatientTargetDto) {}
