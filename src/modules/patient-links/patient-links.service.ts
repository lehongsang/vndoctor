import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FacilityPatientLink } from './entities/facility-patient-link.entity';
import {
  CreatePatientLinkDto,
  QueryPatientLinkDto,
  UpdatePatientLinkDto,
} from './dtos';
import {
  BadRequest,
  Conflict,
  Forbidden,
  NotFound,
} from '@/commons/exceptions';
import { FacilityPatientLinkStatus } from '@/commons/enums/vndoctor.enum';
import { FacilitiesService } from '@/modules/facilities/facilities.service';
import { HealthProfilesService } from '@/modules/health-profiles/health-profiles.service';
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';

@Injectable()
export class PatientLinksService {
  constructor(
    @InjectRepository(FacilityPatientLink)
    private readonly linkRepository: Repository<FacilityPatientLink>,
    private readonly facilitiesService: FacilitiesService,
    private readonly healthProfilesService: HealthProfilesService,
  ) {}

  /**
   * Links a Patient Health Profile to a Medical Facility.
   *
   * @param dto - Linking payload.
   * @param staff - Current staff context.
   * @returns Newly created or reactivated FacilityPatientLink.
   */
  async createLink(
    dto: CreatePatientLinkDto,
    staff?: StaffJwtPayload,
  ): Promise<FacilityPatientLink> {
    let targetFacilityId = dto.facilityId;

    if (staff && staff.facilityId) {
      if (dto.facilityId && dto.facilityId !== staff.facilityId) {
        throw new Forbidden(
          'Bạn chỉ có quyền liên kết bệnh nhân vào cơ sở y tế của mình',
        );
      }
      targetFacilityId = staff.facilityId;
    }

    if (!targetFacilityId) {
      throw new BadRequest('Thiếu ID cơ sở y tế (facilityId)');
    }

    // Verify facility exists
    await this.facilitiesService.getFacilityById(targetFacilityId);

    // Verify health profile exists
    await this.healthProfilesService.getProfileById(dto.healthProfileId);

    // Check duplicate link
    const existing = await this.linkRepository.findOne({
      where: {
        facilityId: targetFacilityId,
        healthProfileId: dto.healthProfileId,
      },
    });

    if (existing) {
      if (existing.status === FacilityPatientLinkStatus.ACTIVE) {
        throw new Conflict('Hồ sơ bệnh nhân đã được liên kết với cơ sở y tế này');
      }

      // Reactivate previously unlinked link
      existing.status = FacilityPatientLinkStatus.ACTIVE;
      existing.phoneNumber = dto.phoneNumber;
      if (dto.hospitalPatientCode) {
        existing.hospitalPatientCode = dto.hospitalPatientCode;
      }
      existing.linkedAt = new Date();
      return this.linkRepository.save(existing);
    }

    const link = this.linkRepository.create({
      facilityId: targetFacilityId,
      healthProfileId: dto.healthProfileId,
      phoneNumber: dto.phoneNumber.trim(),
      hospitalPatientCode: dto.hospitalPatientCode || null,
      status: FacilityPatientLinkStatus.ACTIVE,
      linkedAt: new Date(),
    });

    return this.linkRepository.save(link);
  }

  /**
   * Searches health profiles across the platform by phone number, citizen ID or name.
   *
   * @param keyword - Phone number, CCCD, or full name.
   * @returns Matching HealthProfile array.
   */
  async searchPatients(keyword: string): Promise<HealthProfile[]> {
    if (!keyword || keyword.trim().length < 3) {
      return [];
    }

    const result = await this.healthProfilesService.getProfiles({
      search: keyword.trim(),
      limit: 20,
    });

    return result.items;
  }

  /**
   * Retrieves paginated list of patient links for a facility.
   *
   * @param query - Query filter parameters.
   * @param staff - Staff context.
   * @returns Paginated result list.
   */
  async getFacilityLinks(
    query: QueryPatientLinkDto,
    staff?: StaffJwtPayload,
  ): Promise<{ items: FacilityPatientLink[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.linkRepository
      .createQueryBuilder('link')
      .leftJoinAndSelect('link.facility', 'facility')
      .leftJoinAndSelect('link.healthProfile', 'profile')
      .leftJoinAndSelect('profile.profileChronicDisease', 'pcd');

    const targetFacilityId = staff?.facilityId || query.facilityId;
    if (targetFacilityId) {
      qb.andWhere('link.facilityId = :facilityId', {
        facilityId: targetFacilityId,
      });
    }

    if (query.healthProfileId) {
      qb.andWhere('link.healthProfileId = :healthProfileId', {
        healthProfileId: query.healthProfileId,
      });
    }

    if (query.status) {
      qb.andWhere('link.status = :status', { status: query.status });
    }

    if (query.phoneNumber) {
      qb.andWhere('link.phoneNumber = :phone', {
        phone: query.phoneNumber.trim(),
      });
    }

    if (query.hospitalPatientCode) {
      qb.andWhere('link.hospitalPatientCode = :code', {
        code: query.hospitalPatientCode.trim(),
      });
    }

    if (query.search) {
      const kw = `%${query.search.trim()}%`;
      qb.andWhere(
        '(link.phoneNumber ILIKE :kw OR link.hospitalPatientCode ILIKE :kw OR profile.fullName ILIKE :kw OR profile.citizenId ILIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('link.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Finds link by ID.
   *
   * @param id - Link UUID.
   * @returns FacilityPatientLink entity.
   */
  async getLinkById(id: string): Promise<FacilityPatientLink> {
    const link = await this.linkRepository.findOne({
      where: { id },
      relations: ['facility', 'healthProfile'],
    });

    if (!link) {
      throw new NotFound(`Không tìm thấy liên kết với ID ${id}`);
    }

    return link;
  }

  /**
   * Updates link status or hospital patient code.
   *
   * @param id - Link UUID.
   * @param dto - Update payload.
   * @param staff - Staff context.
   * @returns Updated link.
   */
  async updateLink(
    id: string,
    dto: UpdatePatientLinkDto,
    staff?: StaffJwtPayload,
  ): Promise<FacilityPatientLink> {
    const link = await this.getLinkById(id);

    if (staff && staff.facilityId && link.facilityId !== staff.facilityId) {
      throw new Forbidden('Bạn không có quyền chỉnh sửa liên kết của cơ sở khác');
    }

    Object.assign(link, dto);
    return this.linkRepository.save(link);
  }

  /**
   * Unlinks a patient from a facility.
   *
   * @param facilityId - Facility UUID.
   * @param healthProfileId - Health Profile UUID.
   */
  async unlinkPatient(
    facilityId: string,
    healthProfileId: string,
  ): Promise<{ success: boolean }> {
    const link = await this.linkRepository.findOne({
      where: { facilityId, healthProfileId },
    });

    if (!link) {
      throw new NotFound('Không tìm thấy liên kết giữa cơ sở và bệnh nhân');
    }

    link.status = FacilityPatientLinkStatus.UNLINKED;
    await this.linkRepository.save(link);

    return { success: true };
  }
}
