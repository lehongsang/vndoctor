/**
 * Enum representing basic user roles for BetterAuth / base user system.
 */
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export const ALL_ROLES = Object.values(Role);

/**
 * Permission code type for authorization decorators.
 */
export type PermissionCode = string;
