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
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';

@Injectable()
export class StaffAuthGuard implements CanActivate {
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

    const secret = this.configService.get<string>('JWT_STAFF_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'vndoctor-staff-secret-key-2026';

    try {
      const decoded = jwt.verify(token, secret) as StaffJwtPayload;
      if (decoded.type !== 'STAFF') {
        throw new UnauthorizedException('Token không dành cho nhân viên y tế');
      }

      (request as unknown as { staff: StaffJwtPayload; user: StaffJwtPayload }).staff = decoded;
      (request as unknown as { staff: StaffJwtPayload; user: StaffJwtPayload }).user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
