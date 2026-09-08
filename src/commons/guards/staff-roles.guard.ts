import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '@/commons/decorators/roles.decorator';
import { StaffRole } from '@/commons/enums/vndoctor.enum';
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';

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
      throw new ForbiddenException('Bạn không có quyền truy cập chức năng này');
    }

    const hasRole = requiredRoles.includes(staff.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Yêu cầu quyền [${requiredRoles.join(', ')}], vai trò hiện tại của bạn là ${staff.role}`,
      );
    }

    return true;
  }
}
