import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from '@/commons/enums/app.enum';

export interface NaviCurrentUser {
  id: string;
  role: Role;
  facilityId: string | null;
  patientId: string | null;
  isActive: boolean;
}

/**
 * Reads the authenticated NAVI user attached to the request by auth guards.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): NaviCurrentUser | undefined => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.user as NaviCurrentUser | undefined;
  },
);
