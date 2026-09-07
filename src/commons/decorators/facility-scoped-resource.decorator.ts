import { SetMetadata } from '@nestjs/common';
import type { Type } from '@nestjs/common';

/**
 * Metadata key consumed by `ResourceFacilityScopeGuard` to load the right
 * entity at request time.
 */
export const FACILITY_SCOPED_RESOURCE = 'facility-scoped-resource';

export interface FacilityScopedResourceOptions {
  /**
   * TypeORM entity class used to look up the record. The entity must expose a
   * `facilityId` column for the guard to check.
   */
  entity: Type<unknown>;
  /**
   * Route param that carries the record id. Defaults to `id`.
   */
  paramName?: string;
}

/**
 * Marks a controller handler so `ResourceFacilityScopeGuard` can fetch the
 * targeted record and ensure callers stay inside their facility scope.
 */
export const FacilityScopedResource = (options: FacilityScopedResourceOptions) =>
  SetMetadata(FACILITY_SCOPED_RESOURCE, options);
