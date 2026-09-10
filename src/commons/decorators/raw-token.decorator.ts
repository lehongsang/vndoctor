import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Parameter decorator to extract raw Bearer token from Request Authorization header.
 */
export const RawToken = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization || '';
    const [, token] = authHeader.trim().split(/\s+/, 2);
    return token || '';
  },
);
