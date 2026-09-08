import { PartialType } from '@nestjs/swagger';
import { CreateCarePackageDto } from './create-care-package.dto';

/**
 * DTO for updating an existing Care Package
 */
export class UpdateCarePackageDto extends PartialType(CreateCarePackageDto) {}
