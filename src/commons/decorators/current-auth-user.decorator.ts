import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { AppAccountJwtPayload } from './current-account.decorator';
import type { StaffJwtPayload } from './current-staff.decorator';

export interface AuthUserContext {
  type: 'STAFF' | 'APP_ACCOUNT';
  staff?: StaffJwtPayload;
  account?: AppAccountJwtPayload;
  userId: string;
  facilityId?: string;
}

/**
 * Parameter decorator that extracts the authenticated user context (Staff or App Account)
 * populated by CombinedAuthGuard, StaffAuthGuard, or AppAuthGuard.
 */
export const CurrentAuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUserContext => {
    const request = context.switchToHttp().getRequest<Request & { staff?: StaffJwtPayload; account?: AppAccountJwtPayload }>();

    if (request.staff) {
      return {
        type: 'STAFF',
        staff: request.staff,
        userId: request.staff.id,
        facilityId: request.staff.facilityId,
      };
    }

    if (request.account) {
      return {
        type: 'APP_ACCOUNT',
        account: request.account,
        userId: request.account.id,
        facilityId: undefined,
      };
    }

    return {
      type: 'APP_ACCOUNT',
      userId: '',
    };
  },
);
