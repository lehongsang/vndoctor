import { SetMetadata } from '@nestjs/common';
import type { StaffRole } from '@/commons/enums/vndoctor.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorator to enforce required Staff roles on controller or endpoint.
 *
 * @param roles - One or more required StaffRole values.
 */
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);
