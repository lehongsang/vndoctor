import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '@/commons/decorators/roles.decorator';
import { StaffRole } from '@/commons/enums/vndoctor.enum';
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { Forbidden, ErrorCode } from '@/commons/exceptions';

@Injectable()
export class StaffRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<StaffRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const staff = (request as unknown as { staff?: StaffJwtPayload }).staff;

    if (!staff || !staff.role) {
      throw new Forbidden(ErrorCode.FORBIDDEN);
    }

    // Root Super Admin (VNDOCTOR_ADMIN) has global administrative access
    if (staff.role === StaffRole.VNDOCTOR_ADMIN) {
      return true;
    }

    const hasRole = requiredRoles.includes(staff.role);
    if (!hasRole) {
      throw new Forbidden(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    return true;
  }
}
