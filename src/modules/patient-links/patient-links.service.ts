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
  ErrorCode,
} from '@/commons/exceptions';
import { FacilityPatientLinkStatus } from '@/commons/enums/vndoctor.enum';
import { FacilitiesService } from '@/modules/facilities/facilities.service';
import { HealthProfilesService } from '@/modules/health-profiles/health-profiles.service';
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { PatientLinksSseService } from './patient-links-sse.service';

@Injectable()
export class PatientLinksService {
  constructor(
    @InjectRepository(FacilityPatientLink)
    private readonly linkRepository: Repository<FacilityPatientLink>,
    private readonly facilitiesService: FacilitiesService,
    private readonly healthProfilesService: HealthProfilesService,
    private readonly sseService: PatientLinksSseService,
  ) {}

  /**
   * Links a Patient Health Profile to a Medical Facility.
   * If status is PENDING, emits an SSE invitation event to the target patient.
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
        throw new Forbidden(ErrorCode.FACILITY_ACCESS_DENIED);
      }
      targetFacilityId = staff.facilityId;
    }

    if (!targetFacilityId) {
      throw new BadRequest(ErrorCode.MISSING_REQUIRED_FIELD);
    }

    // Verify facility exists
    const facility = await this.facilitiesService.getFacilityById(targetFacilityId);

    // Verify health profile exists
    const profile = await this.healthProfilesService.getProfileById(dto.healthProfileId);

    // Check duplicate link
    const existing = await this.linkRepository.findOne({
      where: {
        facilityId: targetFacilityId,
        healthProfileId: dto.healthProfileId,
      },
    });

    const targetStatus = dto.status || FacilityPatientLinkStatus.ACTIVE;

    if (existing) {
      if (existing.status === FacilityPatientLinkStatus.ACTIVE) {
        throw new Conflict(ErrorCode.PATIENT_ALREADY_LINKED);
      }

      // Reactivate previously unlinked or pending link
      existing.status = targetStatus;
      existing.phoneNumber = dto.phoneNumber;
      if (dto.hospitalPatientCode) {
        existing.hospitalPatientCode = dto.hospitalPatientCode;
      }
      existing.linkedAt = new Date();
      const updated = await this.linkRepository.save(existing);

      if (targetStatus === FacilityPatientLinkStatus.PENDING && profile.accountId) {
        this.sseService.emitInvitation(profile.accountId, {
          linkId: updated.id,
          facilityId: facility.id,
          facilityName: facility.facilityName,
          healthProfileId: profile.id,
          hospitalPatientCode: updated.hospitalPatientCode,
        });
      }

      return updated;
    }

    const link = this.linkRepository.create({
      facilityId: targetFacilityId,
      healthProfileId: dto.healthProfileId,
      phoneNumber: dto.phoneNumber.trim(),
      hospitalPatientCode: dto.hospitalPatientCode || null,
      status: targetStatus,
      linkedAt: new Date(),
    });

    const savedLink = await this.linkRepository.save(link);

    // If link created with PENDING status, send real-time notification to patient via SSE
    if (targetStatus === FacilityPatientLinkStatus.PENDING && profile.accountId) {
      this.sseService.emitInvitation(profile.accountId, {
        linkId: savedLink.id,
        facilityId: facility.id,
        facilityName: facility.facilityName,
        healthProfileId: profile.id,
        hospitalPatientCode: savedLink.hospitalPatientCode,
      });
    }

    return savedLink;
  }

  /**
   * Searches health profiles across the platform by phone number, citizen ID or name.
   *
   * @param query - Search criteria.
   * @returns Array of matching HealthProfile objects with facility linking status.
   */
  async searchPlatformPatients(
    query: QueryPatientLinkDto,
  ): Promise<HealthProfile[]> {
    const res = await this.healthProfilesService.getProfiles({
      phoneNumber: query.phoneNumber,
      citizenId: query.citizenId,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
    return res.items;
  }

  /**
   * Retrieves paginated list of patient links for a facility.
   *
   * @param query - Query filter parameters.
   * @param staff - Staff context.
   * @returns Paginated result list.
   */
  async getFacilityPatients(
    query: QueryPatientLinkDto,
    staff?: StaffJwtPayload,
  ): Promise<{ items: FacilityPatientLink[]; total: number; page: number; limit: number }> {
    const targetFacilityId =
      staff && staff.facilityId ? staff.facilityId : query.facilityId;

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.linkRepository
      .createQueryBuilder('link')
      .leftJoinAndSelect('link.healthProfile', 'profile')
      .leftJoinAndSelect('link.facility', 'facility')
      .leftJoinAndSelect('profile.profileChronicDisease', 'pcd');

    if (targetFacilityId) {
      qb.andWhere('link.facilityId = :facilityId', {
        facilityId: targetFacilityId,
      });
    }

    if (query.status) {
      qb.andWhere('link.status = :status', { status: query.status });
    }

    if (query.search) {
      const kw = `%${query.search.trim()}%`;
      qb.andWhere(
        '(profile.fullName ILIKE :kw OR profile.phoneNumber ILIKE :kw OR profile.citizenId ILIKE :kw OR link.hospitalPatientCode ILIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('link.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Gets pending invitations for authenticated mobile app user.
   *
   * @param accountId - Authenticated App Account ID
   * @returns List of pending invitations
   */
  async getMyInvitations(accountId: string): Promise<FacilityPatientLink[]> {
    return this.linkRepository
      .createQueryBuilder('link')
      .leftJoinAndSelect('link.facility', 'facility')
      .leftJoinAndSelect('link.healthProfile', 'profile')
      .where('profile.accountId = :accountId', { accountId })
      .andWhere('link.status = :status', { status: FacilityPatientLinkStatus.PENDING })
      .orderBy('link.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Gets active facility links for authenticated mobile app user.
   *
   * @param accountId - Authenticated App Account ID
   * @returns List of active links
   */
  async getMyLinks(accountId: string): Promise<FacilityPatientLink[]> {
    return this.linkRepository
      .createQueryBuilder('link')
      .leftJoinAndSelect('link.facility', 'facility')
      .leftJoinAndSelect('link.healthProfile', 'profile')
      .where('profile.accountId = :accountId', { accountId })
      .andWhere('link.status = :status', { status: FacilityPatientLinkStatus.ACTIVE })
      .orderBy('link.linkedAt', 'DESC')
      .getMany();
  }

  /**
   * Accepts a pending facility link invitation from mobile app.
   *
   * @param id - Link UUID
   * @param accountId - Authenticated App Account ID
   * @returns Updated link
   */
  async acceptInvitation(id: string, accountId: string): Promise<FacilityPatientLink> {
    const link = await this.linkRepository.findOne({
      where: { id },
      relations: ['healthProfile', 'facility'],
    });

    if (!link) {
      throw new NotFound(ErrorCode.PATIENT_LINK_NOT_FOUND);
    }

    if (link.healthProfile.accountId !== accountId) {
      throw new Forbidden(ErrorCode.HEALTH_PROFILE_ACCESS_DENIED);
    }

    link.status = FacilityPatientLinkStatus.ACTIVE;
    link.linkedAt = new Date();
    const updated = await this.linkRepository.save(link);

    this.sseService.emitStatusChange(accountId, {
      linkId: link.id,
      facilityId: link.facilityId,
      status: FacilityPatientLinkStatus.ACTIVE,
    });

    return updated;
  }

  /**
   * Rejects a pending facility link invitation from mobile app.
   *
   * @param id - Link UUID
   * @param accountId - Authenticated App Account ID
   * @returns Success response
   */
  async rejectInvitation(id: string, accountId: string): Promise<{ success: boolean; message: string }> {
    const link = await this.linkRepository.findOne({
      where: { id },
      relations: ['healthProfile', 'facility'],
    });

    if (!link) {
      throw new NotFound(ErrorCode.PATIENT_LINK_NOT_FOUND);
    }

    if (link.healthProfile.accountId !== accountId) {
      throw new Forbidden(ErrorCode.HEALTH_PROFILE_ACCESS_DENIED);
    }

    link.status = FacilityPatientLinkStatus.UNLINKED;
    await this.linkRepository.save(link);

    this.sseService.emitStatusChange(accountId, {
      linkId: link.id,
      facilityId: link.facilityId,
      status: FacilityPatientLinkStatus.UNLINKED,
    });

    return {
      success: true,
      message: 'Invitation rejected successfully',
    };
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
      throw new NotFound(ErrorCode.PATIENT_LINK_NOT_FOUND);
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
      throw new Forbidden(ErrorCode.FACILITY_ACCESS_DENIED);
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
      throw new NotFound(ErrorCode.PATIENT_LINK_NOT_FOUND);
    }

    link.status = FacilityPatientLinkStatus.UNLINKED;
    await this.linkRepository.save(link);

    return { success: true };
  }
}
