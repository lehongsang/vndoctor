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
import { RedisService } from '@/services/redis/redis.service';
import { getBlacklistTokenKey } from '@/utils/key-redis';
import { Unauthorized, ErrorCode } from '@/commons/exceptions';

@Injectable()
export class AppAuthGuard implements CanActivate {
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

    const secret = this.configService.get<string>('JWT_APP_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'vndoctor-app-secret-key-2026';

    try {
      const decoded = jwt.verify(token, secret) as AppAccountJwtPayload;
      if (decoded.type !== 'APP_ACCOUNT') {
        throw new Unauthorized(ErrorCode.TOKEN_AUDIENCE_MISMATCH);
      }

      (request as unknown as { account: AppAccountJwtPayload; user: AppAccountJwtPayload; rawToken: string }).account = decoded;
      (request as unknown as { account: AppAccountJwtPayload; user: AppAccountJwtPayload; rawToken: string }).user = decoded;
      (request as unknown as { rawToken: string }).rawToken = token;
      return true;
    } catch {
      throw new Unauthorized(ErrorCode.TOKEN_INVALID);
    }
  }
}
