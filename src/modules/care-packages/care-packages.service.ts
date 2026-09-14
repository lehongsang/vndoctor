import { CarePackageStatus, CarePackageType, StaffRole } from '@/commons/enums/vndoctor.enum';
import { BadRequest, Conflict, Forbidden, NotFound, ErrorCode } from '@/commons/exceptions';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateCarePackageDto,
  QueryCarePackageDto,
  UpdateCarePackageDto,
} from './dtos';
import { CarePackage } from './entities/care-package.entity';

/**
 * Service managing medical care package operations.
 */
@Injectable()
export class CarePackagesService {
  constructor(
    @InjectRepository(CarePackage)
    private readonly carePackageRepo: Repository<CarePackage>,
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
    @InjectRepository(StaffUser)
    private readonly staffRepo: Repository<StaffUser>,
  ) {}

  /**
   * Helper to generate unique care package code (e.g. PKG-20260912-ABCD).
   */
  private generatePackageCode(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PKG-${dateStr}-${randomSuffix}`;
  }

  /**
   * Create a new Care Package for a facility with auto-generated unique package code.
   * - Type STANDARD: doctorExpertId must be null (forbidden).
   * - Type VIP: doctorExpertId is required and must exist.
   *
   * @param dto Input data for creating care package
   * @param staffFacilityId Facility ID of the authenticated staff
   * @returns Created CarePackage entity
   */
  async create(
    dto: CreateCarePackageDto,
    staffFacilityId?: string,
  ): Promise<CarePackage> {
    // 1. Determine target facility ID
    const facilityId = dto.facilityId || staffFacilityId;
    if (!facilityId) {
      throw new NotFound(ErrorCode.FACILITY_NOT_FOUND);
    }

    // 2. Validate facility existence
    const facility = await this.facilityRepo.findOne({
      where: { id: facilityId },
    });
    if (!facility) {
      throw new NotFound(ErrorCode.FACILITY_NOT_FOUND);
    }

    // 3. Validate package type and doctorExpertId
    const packageType = dto.type ?? CarePackageType.STANDARD;
    if (packageType === CarePackageType.STANDARD) {
      if (dto.doctorExpertId) {
        throw new BadRequest(ErrorCode.BAD_REQUEST);
      }
    } else if (packageType === CarePackageType.VIP) {
      if (!dto.doctorExpertId) {
        throw new BadRequest(ErrorCode.MISSING_REQUIRED_FIELD);
      }
      const expert = await this.staffRepo.findOne({
        where: { id: dto.doctorExpertId },
      });
      if (!expert) {
        throw new NotFound(ErrorCode.STAFF_NOT_FOUND);
      }
      if (expert.facilityId && expert.facilityId !== facilityId) {
        throw new BadRequest(ErrorCode.FACILITY_ACCESS_DENIED);
      }
      if (!expert.isActive) {
        throw new BadRequest(ErrorCode.STAFF_INACTIVE);
      }
    }

    // 4. Generate unique package code
    let code = this.generatePackageCode();
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      const existing = await this.carePackageRepo.findOne({
        where: { code },
      });
      if (!existing) {
        isUnique = true;
      } else {
        code = this.generatePackageCode();
        attempts++;
      }
    }
    if (!isUnique) {
      throw new Conflict(ErrorCode.CARE_PACKAGE_CODE_ALREADY_EXISTS);
    }

    // 5. Create and persist care package entity
    const carePackage = this.carePackageRepo.create({
      facilityId,
      code,
      name: dto.name.trim(),
      type: packageType,
      doctorExpertId: packageType === CarePackageType.VIP ? dto.doctorExpertId : null,
      description: dto.description ?? null,
      durationDays: dto.durationDays,
      priceAmount: dto.priceAmount,
      status: dto.status ?? CarePackageStatus.ACTIVE,
    });

    return this.carePackageRepo.save(carePackage);
  }

  /**
   * Find Care Packages with filtering, searching, and pagination based on caller context.
   * - Staff users only see packages of their own facility (unless VNDOCTOR_ADMIN).
   * - App users (Account) can view all packages across all facilities.
   *
   * @param query Query filters
   * @param caller Context of authenticated caller
   * @returns Paginated list of Care Packages
   */
  async findAll(
    query: QueryCarePackageDto,
    caller?: { type?: 'STAFF' | 'APP_ACCOUNT'; facilityId?: string; role?: StaffRole },
  ): Promise<{ data: CarePackage[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.carePackageRepo
      .createQueryBuilder('pkg')
      .leftJoinAndSelect('pkg.facility', 'facility')
      .leftJoinAndSelect('pkg.doctorExpert', 'doctorExpert');

    // If caller is Staff and has facilityId (and not VNDOCTOR_ADMIN), enforce their own facility
    if (caller?.type === 'STAFF' && caller.facilityId && caller.role !== StaffRole.VNDOCTOR_ADMIN) {
      qb.andWhere('pkg.facilityId = :facilityId', {
        facilityId: caller.facilityId,
      });
    } else if (query.facilityId) {
      // For App Account or VNDOCTOR_ADMIN, filter by query.facilityId if provided
      qb.andWhere('pkg.facilityId = :facilityId', {
        facilityId: query.facilityId,
      });
    }

    if (query.type) {
      qb.andWhere('pkg.type = :type', { type: query.type });
    }

    if (query.status) {
      qb.andWhere('pkg.status = :status', { status: query.status });
    }

    if (query.search) {
      const searchKeyword = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(pkg.name) LIKE :searchKeyword OR LOWER(pkg.code) LIKE :searchKeyword)',
        { searchKeyword },
      );
    }

    qb.orderBy('pkg.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find a specific Care Package by ID.
   *
   * @param id Care Package UUID
   * @returns CarePackage entity
   */
  async findById(id: string): Promise<CarePackage> {
    const carePackage = await this.carePackageRepo.findOne({
      where: { id },
      relations: ['facility', 'doctorExpert'],
    });

    if (!carePackage) {
      throw new NotFound(ErrorCode.CARE_PACKAGE_NOT_FOUND);
    }

    return carePackage;
  }

  /**
   * Update Care Package details.
   *
   * @param id Care Package UUID
   * @param dto Update data
   * @param staffFacilityId Facility ID of the authenticated staff
   * @returns Updated CarePackage entity
   */
  async update(
    id: string,
    dto: UpdateCarePackageDto,
    staffFacilityId?: string,
  ): Promise<CarePackage> {
    const carePackage = await this.findById(id);

    // 1. Verify facility ownership if staff facility ID is provided
    if (staffFacilityId && carePackage.facilityId !== staffFacilityId) {
      throw new Forbidden(ErrorCode.FACILITY_ACCESS_DENIED);
    }

    // 2. If facility ID changed, verify new facility exists
    if (dto.facilityId && dto.facilityId !== carePackage.facilityId) {
      const facility = await this.facilityRepo.findOne({
        where: { id: dto.facilityId },
      });
      if (!facility) {
        throw new NotFound(ErrorCode.FACILITY_NOT_FOUND);
      }
      carePackage.facilityId = dto.facilityId;
    }

    // 3. Validate package type and doctorExpertId
    const targetType = dto.type !== undefined ? dto.type : carePackage.type;
    const targetFacilityId = carePackage.facilityId;

    if (targetType === CarePackageType.STANDARD) {
      if (dto.doctorExpertId) {
        throw new BadRequest(ErrorCode.BAD_REQUEST);
      }
      carePackage.doctorExpertId = null;
    } else if (targetType === CarePackageType.VIP) {
      const expertIdToCheck = dto.doctorExpertId !== undefined ? dto.doctorExpertId : carePackage.doctorExpertId;
      if (!expertIdToCheck) {
        throw new BadRequest(ErrorCode.MISSING_REQUIRED_FIELD);
      }
      if (dto.doctorExpertId && dto.doctorExpertId !== carePackage.doctorExpertId) {
        const expert = await this.staffRepo.findOne({
          where: { id: dto.doctorExpertId },
        });
        if (!expert) {
          throw new NotFound(ErrorCode.STAFF_NOT_FOUND);
        }
        if (expert.facilityId && expert.facilityId !== targetFacilityId) {
          throw new BadRequest(ErrorCode.FACILITY_ACCESS_DENIED);
        }
        if (!expert.isActive) {
          throw new BadRequest(ErrorCode.STAFF_INACTIVE);
        }
      }
      carePackage.doctorExpertId = expertIdToCheck;
    }

    // 4. Update fields
    if (dto.name !== undefined) carePackage.name = dto.name.trim();
    if (dto.type !== undefined) carePackage.type = dto.type;
    if (dto.description !== undefined) carePackage.description = dto.description;
    if (dto.durationDays !== undefined) carePackage.durationDays = dto.durationDays;
    if (dto.priceAmount !== undefined) carePackage.priceAmount = dto.priceAmount;
    if (dto.status !== undefined) carePackage.status = dto.status;

    return this.carePackageRepo.save(carePackage);
  }

  /**
   * Update Care Package operational status (ACTIVE / INACTIVE).
   *
   * @param id Care Package UUID
   * @param status New status
   * @param staffFacilityId Facility ID of the authenticated staff
   * @returns Updated CarePackage entity
   */
  async updateStatus(
    id: string,
    status: CarePackageStatus,
    staffFacilityId?: string,
  ): Promise<CarePackage> {
    const carePackage = await this.findById(id);

    if (staffFacilityId && carePackage.facilityId !== staffFacilityId) {
      throw new Forbidden(ErrorCode.FACILITY_ACCESS_DENIED);
    }

    carePackage.status = status;
    return this.carePackageRepo.save(carePackage);
  }

  /**
   * Soft delete a Care Package by deactivating and setting deletedAt.
   *
   * @param id Care Package UUID
   * @param staffFacilityId Facility ID of the authenticated staff
   * @returns Soft deletion result
   */
  async softDelete(
    id: string,
    staffFacilityId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const carePackage = await this.findById(id);

    if (staffFacilityId && carePackage.facilityId !== staffFacilityId) {
      throw new Forbidden(ErrorCode.FACILITY_ACCESS_DENIED);
    }

    carePackage.status = CarePackageStatus.INACTIVE;
    await this.carePackageRepo.save(carePackage);
    await this.carePackageRepo.softRemove(carePackage);

    return { success: true, message: 'Care package deleted successfully' };
  }
}

