import { PartialType } from '@nestjs/swagger';
import { CreateHealthProfileDto } from './create-health-profile.dto';

export class UpdateHealthProfileDto extends PartialType(CreateHealthProfileDto) {}
