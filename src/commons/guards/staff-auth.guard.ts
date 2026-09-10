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
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { RedisService } from '@/services/redis/redis.service';
import { getBlacklistTokenKey } from '@/utils/key-redis';
import { Unauthorized, ErrorCode } from '@/commons/exceptions';

@Injectable()
export class StaffAuthGuard implements CanActivate {
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

    const secret = this.configService.get<string>('JWT_STAFF_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'vndoctor-staff-secret-key-2026';

    try {
      const decoded = jwt.verify(token, secret) as StaffJwtPayload;
      if (decoded.type !== 'STAFF') {
        throw new Unauthorized(ErrorCode.TOKEN_AUDIENCE_MISMATCH);
      }

      (request as unknown as { staff: StaffJwtPayload; user: StaffJwtPayload; rawToken: string }).staff = decoded;
      (request as unknown as { staff: StaffJwtPayload; user: StaffJwtPayload; rawToken: string }).user = decoded;
      (request as unknown as { rawToken: string }).rawToken = token;
      return true;
    } catch {
      throw new Unauthorized(ErrorCode.TOKEN_INVALID);
    }
  }
}
