import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

export interface AppAccountJwtPayload {
  id: string;
  phoneNumber: string;
  email?: string | null;
  type: 'APP_ACCOUNT';
}

/**
 * Parameter decorator to extract current authenticated Patient App Account from Request.
 */
export const CurrentAccount = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AppAccountJwtPayload | undefined => {
    const request = context.switchToHttp().getRequest<Request>();
    return (request as unknown as { account?: AppAccountJwtPayload }).account;
  },
);
