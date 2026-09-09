import { CarePackageStatus } from '@/commons/enums/vndoctor.enum';
import { Conflict, Forbidden, NotFound } from '@/commons/exceptions';
import { Facility } from '@/modules/facilities/entities/facility.entity';
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
  ) {}

  /**
   * Create a new Care Package for a facility.
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
      throw new NotFound('Không xác định được cơ sở y tế cho gói chăm sóc');
    }

    // 2. Validate facility existence
    const facility = await this.facilityRepo.findOne({
      where: { id: facilityId },
    });
    if (!facility) {
      throw new NotFound(`Cơ sở y tế với ID ${facilityId} không tồn tại`);
    }

    // 3. Validate unique code
    const existingCode = await this.carePackageRepo.findOne({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (existingCode) {
      throw new Conflict(`Mã gói chăm sóc '${dto.code}' đã tồn tại trong hệ thống`);
    }

    // 4. Create and persist care package entity
    const carePackage = this.carePackageRepo.create({
      facilityId,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      type: dto.type,
      description: dto.description ?? null,
      durationDays: dto.durationDays,
      priceAmount: dto.priceAmount,
      status: dto.status ?? CarePackageStatus.ACTIVE,
    });

    return this.carePackageRepo.save(carePackage);
  }

  /**
   * Find Care Packages with filtering, searching, and pagination.
   *
   * @param query Query filters
   * @returns Paginated list of Care Packages
   */
  async findAll(
    query: QueryCarePackageDto,
  ): Promise<{ data: CarePackage[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.carePackageRepo
      .createQueryBuilder('pkg')
      .leftJoinAndSelect('pkg.facility', 'facility');

    if (query.facilityId) {
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
      relations: ['facility'],
    });

    if (!carePackage) {
      throw new NotFound(`Gói chăm sóc với ID ${id} không tồn tại`);
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
      throw new Forbidden('Bạn không có quyền chỉnh sửa gói chăm sóc của cơ sở y tế khác');
    }

    // 2. If code changed, verify unique code
    if (dto.code && dto.code.trim().toUpperCase() !== carePackage.code) {
      const normalizedCode = dto.code.trim().toUpperCase();
      const existing = await this.carePackageRepo.findOne({
        where: { code: normalizedCode },
      });
      if (existing && existing.id !== id) {
        throw new Conflict(`Mã gói chăm sóc '${dto.code}' đã tồn tại trong hệ thống`);
      }
      carePackage.code = normalizedCode;
    }

    // 3. If facility ID changed, verify new facility exists
    if (dto.facilityId && dto.facilityId !== carePackage.facilityId) {
      const facility = await this.facilityRepo.findOne({
        where: { id: dto.facilityId },
      });
      if (!facility) {
        throw new NotFound(`Cơ sở y tế với ID ${dto.facilityId} không tồn tại`);
      }
      carePackage.facilityId = dto.facilityId;
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
      throw new Forbidden('Bạn không có quyền cập nhật trạng thái gói chăm sóc của cơ sở y tế khác');
    }

    carePackage.status = status;
    return this.carePackageRepo.save(carePackage);
  }
}
