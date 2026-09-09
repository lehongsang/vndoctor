import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Facility } from './entities/facility.entity';
import { CreateFacilityDto, QueryFacilityDto, UpdateFacilityDto } from './dtos';
import { Conflict, Forbidden, NotFound } from '@/commons/exceptions';
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { StaffRole } from '@/commons/enums/vndoctor.enum';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectRepository(Facility)
    private readonly facilityRepository: Repository<Facility>,
  ) {}

  /**
   * Creates a new medical facility with hierarchical authorization.
   *
   * @param dto - Facility creation data.
   * @param creator - Authenticated staff creator info.
   * @returns Newly created facility.
   */
  async createFacility(
    dto: CreateFacilityDto,
    creator?: StaffJwtPayload,
  ): Promise<Facility> {
    // 1. Check duplicate facilityCode
    const existing = await this.facilityRepository.findOne({
      where: { facilityCode: dto.facilityCode },
    });

    if (existing) {
      throw new Conflict(
        `Cơ sở y tế với mã ${dto.facilityCode} đã tồn tại trong hệ thống`,
      );
    }

    // 2. Enforce hierarchy rules based on creator's facility & role
    let targetParentId = dto.parentId || null;

    if (creator && creator.role !== StaffRole.VNDOCTOR_ADMIN && creator.facilityId) {
      // If the creator is a regular Facility Admin, they can ONLY create sub-facilities under their own facility
      if (dto.parentId && dto.parentId !== creator.facilityId) {
        throw new Forbidden(
          'Bạn chỉ có quyền tạo cơ sở y tế trực thuộc cơ sở y tế do bạn quản lý',
        );
      }
      targetParentId = creator.facilityId;
    }

    // 3. Verify parent facility exists if targetParentId is set
    if (targetParentId) {
      const parentFacility = await this.facilityRepository.findOne({
        where: { id: targetParentId },
      });

      if (!parentFacility) {
        throw new NotFound(
          `Không tìm thấy cơ sở y tế cấp trên với ID ${targetParentId}`,
        );
      }

      if (!parentFacility.isActive) {
        throw new Forbidden(
          'Cơ sở y tế cấp trên hiện đang bị vô hiệu hóa, không thể tạo cơ sở trực thuộc',
        );
      }
    }

    // 4. Create & save facility
    const facility = this.facilityRepository.create({
      ...dto,
      parentId: targetParentId,
    });

    return this.facilityRepository.save(facility);
  }

  /**
   * Retrieves paginated list of facilities with optional keyword, hierarchy and status filters.
   *
   * @param query - Filter and pagination criteria.
   * @returns Paginated list and total count.
   */
  async getFacilities(
    query: QueryFacilityDto,
  ): Promise<{ items: Facility[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.facilityRepository
      .createQueryBuilder('facility')
      .leftJoinAndSelect('facility.parent', 'parent');

    if (query.search) {
      const keyword = `%${query.search.trim()}%`;
      qb.where(
        '(facility.facilityName ILIKE :kw OR facility.facilityCode ILIKE :kw)',
        { kw: keyword },
      );
    }

    if (query.facilityType) {
      qb.andWhere('facility.facilityType = :facilityType', {
        facilityType: query.facilityType,
      });
    }

    if (query.parentId) {
      qb.andWhere('facility.parentId = :parentId', {
        parentId: query.parentId,
      });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('facility.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    qb.orderBy('facility.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Finds facility by UUID.
   *
   * @param id - Facility UUID.
   * @returns Facility entity.
   */
  async getFacilityById(id: string): Promise<Facility> {
    const facility = await this.facilityRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!facility) {
      throw new NotFound(`Không tìm thấy cơ sở y tế với ID ${id}`);
    }

    return facility;
  }

  /**
   * Gets direct child facilities under a specific parent facility.
   *
   * @param parentId - Parent facility UUID.
   * @returns Array of direct child facilities.
   */
  async getChildrenFacilities(parentId: string): Promise<Facility[]> {
    await this.getFacilityById(parentId);
    return this.facilityRepository.find({
      where: { parentId },
      order: { facilityName: 'ASC' },
    });
  }

  /**
   * Gets complete tree structure of facilities starting from root or a specific branch.
   *
   * @param rootId - Optional root facility ID.
   * @returns Nested tree of facilities.
   */
  async getFacilityTree(rootId?: string): Promise<Facility[]> {
    if (rootId) {
      const root = await this.facilityRepository.findOne({
        where: { id: rootId },
        relations: ['children', 'children.children'],
      });
      return root ? [root] : [];
    }

    return this.facilityRepository.find({
      where: { parentId: IsNull() },
      relations: ['children', 'children.children'],
      order: { facilityName: 'ASC' },
    });
  }

  /**
   * Updates facility details.
   *
   * @param id - Facility UUID.
   * @param dto - Updated fields.
   * @returns Updated facility entity.
   */
  async updateFacility(id: string, dto: UpdateFacilityDto): Promise<Facility> {
    const facility = await this.getFacilityById(id);
    Object.assign(facility, dto);
    return this.facilityRepository.save(facility);
  }
}
