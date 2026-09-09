import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { StaffRole } from '@/commons/enums/vndoctor.enum';

export interface StaffJwtPayload {
  id: string;
  facilityId?: string;
  staffCode: string;
  username: string;
  fullName: string;
  role: StaffRole;
  type: 'STAFF';
}

/**
 * Parameter decorator to extract current authenticated Staff user from Request.
 */
export const CurrentStaff = createParamDecorator(
  (_data: unknown, context: ExecutionContext): StaffJwtPayload | undefined => {
    const request = context.switchToHttp().getRequest<Request>();
    return (request as unknown as { staff?: StaffJwtPayload }).staff;
  },
);
