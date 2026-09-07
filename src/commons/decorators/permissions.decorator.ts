import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@/commons/enums/app.enum';

export const PERMISSIONS_KEY = 'navi:permissions';

/**
 * Requires one or more action permissions for the decorated route.
 */
export const Permissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
