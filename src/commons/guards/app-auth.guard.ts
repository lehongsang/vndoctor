import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '@/commons/decorators/public.decorator';
import { AppAccountJwtPayload } from '@/commons/decorators/current-account.decorator';

@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
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
      throw new UnauthorizedException('Thiếu Authorization Header');
    }

    const [scheme, token] = authHeader.trim().split(/\s+/, 2);
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Định dạng Token không hợp lệ (cần Bearer <token>)');
    }

    const secret = this.configService.get<string>('JWT_APP_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'vndoctor-app-secret-key-2026';

    try {
      const decoded = jwt.verify(token, secret) as AppAccountJwtPayload;
      if (decoded.type !== 'APP_ACCOUNT') {
        throw new UnauthorizedException('Token không dành cho tài khoản Bệnh nhân');
      }

      (request as unknown as { account: AppAccountJwtPayload; user: AppAccountJwtPayload }).account = decoded;
      (request as unknown as { account: AppAccountJwtPayload; user: AppAccountJwtPayload }).user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
