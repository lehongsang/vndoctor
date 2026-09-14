import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '@/commons/decorators/public.decorator';
import { AppAccountJwtPayload } from '@/commons/decorators/current-account.decorator';
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { RedisService } from '@/services/redis/redis.service';
import { getBlacklistTokenKey } from '@/utils/key-redis';
import { Unauthorized, ErrorCode } from '@/commons/exceptions';

/**
 * Guard that accepts either Staff JWT token or App Account JWT token.
 * Populates request.staff or request.account, and sets request.user accordingly.
 */
@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new Unauthorized(ErrorCode.TOKEN_MISSING);
    }

    const [scheme, token] = authHeader.trim().split(/\s+/, 2);
    if (scheme !== 'Bearer' || !token) {
      throw new Unauthorized(ErrorCode.TOKEN_INVALID_FORMAT);
    }

    const blacklistKey = getBlacklistTokenKey(token);
    const isBlacklisted = await this.redisService.get(blacklistKey);
    if (isBlacklisted) {
      throw new Unauthorized(ErrorCode.TOKEN_BLACKLISTED);
    }

    // Try decoding without verification to detect token audience/type
    const unverified = jwt.decode(token) as { type?: string } | null;
    if (!unverified || !unverified.type) {
      throw new Unauthorized(ErrorCode.TOKEN_INVALID);
    }

    if (unverified.type === 'STAFF') {
      const secret =
        this.configService.get<string>('JWT_STAFF_SECRET') ||
        this.configService.get<string>('JWT_SECRET') ||
        'vndoctor-staff-secret-key-2026';
      try {
        const decoded = jwt.verify(token, secret) as StaffJwtPayload;
        (request as unknown as { staff: StaffJwtPayload; user: StaffJwtPayload; rawToken: string }).staff = decoded;
        (request as unknown as { staff: StaffJwtPayload; user: StaffJwtPayload; rawToken: string }).user = decoded;
        (request as unknown as { rawToken: string }).rawToken = token;
        return true;
      } catch {
        throw new Unauthorized(ErrorCode.TOKEN_INVALID);
      }
    } else if (unverified.type === 'APP_ACCOUNT') {
      const secret =
        this.configService.get<string>('JWT_APP_SECRET') ||
        this.configService.get<string>('JWT_SECRET') ||
        'vndoctor-app-secret-key-2026';
      try {
        const decoded = jwt.verify(token, secret) as AppAccountJwtPayload;
        (request as unknown as { account: AppAccountJwtPayload; user: AppAccountJwtPayload; rawToken: string }).account = decoded;
        (request as unknown as { account: AppAccountJwtPayload; user: AppAccountJwtPayload; rawToken: string }).user = decoded;
        (request as unknown as { rawToken: string }).rawToken = token;
        return true;
      } catch {
        throw new Unauthorized(ErrorCode.TOKEN_INVALID);
      }
    }

    throw new Unauthorized(ErrorCode.TOKEN_AUDIENCE_MISMATCH);
  }
}
