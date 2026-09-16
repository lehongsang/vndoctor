import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreatePatientLinkDto,
  QueryPatientLinkDto,
  RequestPatientLinkDto,
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
import { Account } from '@/modules/accounts/entities/account.entity';
import { PatientLinksSseService } from './patient-links-sse.service';

@Injectable()
export class PatientLinksService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(HealthProfile)
    private readonly healthProfileRepository: Repository<HealthProfile>,
    private readonly facilitiesService: FacilitiesService,
    private readonly healthProfilesService: HealthProfilesService,
    private readonly sseService: PatientLinksSseService,
  ) {}

  /**
   * Helper to generate unique hospital patient code (e.g. BN-20260916-ABCD).
   */
  public generatePatientCode(): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BN-${dateStr}-${randomHex}`;
  }

  /**
   * Links a Patient Health Profile to a Medical Facility.
   * If status is PENDING, emits an SSE invitation event to the target patient.
   *
   * @param dto - Linking payload.
   * @param staff - Current staff context.
   * @returns Updated HealthProfile.
   */
  async createLink(
    dto: CreatePatientLinkDto,
    staff?: StaffJwtPayload,
  ): Promise<HealthProfile> {
    let targetFacilityId = dto.facilityId;

    if (staff && staff.facilityId) {
      if (dto.facilityId && dto.facilityId !== staff.facilityId) {
        throw new Forbidden(
          ErrorCode.FACILITY_ACCESS_DENIED,
          'Bạn không có quyền tạo liên kết cho cơ sở y tế khác với cơ sở bạn đang công tác',
        );
      }
      targetFacilityId = staff.facilityId;
    }

    if (!targetFacilityId) {
      throw new BadRequest(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'Thiếu thông tin mã định danh (ID) cơ sở y tế cần liên kết',
      );
    }

    // Verify facility exists
    const facility = await this.facilitiesService.getFacilityById(targetFacilityId);

    // Verify health profile exists
    const profile = await this.healthProfilesService.getProfileById(dto.healthProfileId);

    const targetStatus = dto.status || FacilityPatientLinkStatus.ACTIVE;

    if (
      profile.facilityId === targetFacilityId &&
      profile.isLinked &&
      profile.linkStatus === FacilityPatientLinkStatus.ACTIVE
    ) {
      throw new Conflict(
        ErrorCode.PATIENT_ALREADY_LINKED,
        `Hồ sơ sức khỏe "${profile.fullName}" đã được liên kết và đang hoạt động tại cơ sở y tế này`,
      );
    }

    profile.facilityId = targetFacilityId;
    if (dto.phoneNumber) {
      profile.phoneNumber = dto.phoneNumber.trim();
    }
    if (!profile.hospitalPatientCode) {
      profile.hospitalPatientCode = this.generatePatientCode();
    }
    profile.linkStatus = targetStatus;
    profile.isLinked = targetStatus === FacilityPatientLinkStatus.ACTIVE && Boolean(profile.accountId);
    profile.linkedAt = new Date();

    const savedProfile = await this.healthProfileRepository.save(profile);

    // If link created with PENDING status, send real-time notification to patient via SSE
    if (targetStatus === FacilityPatientLinkStatus.PENDING && profile.accountId) {
      this.sseService.emitInvitation(profile.accountId, {
        linkId: savedProfile.id,
        facilityId: facility.id,
        facilityName: facility.facilityName,
        healthProfileId: profile.id,
        hospitalPatientCode: savedProfile.hospitalPatientCode,
      });
    }

    return savedProfile;
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
   * Retrieves paginated list of patient profiles for a facility.
   *
   * @param query - Query filter parameters.
   * @param staff - Staff context.
   * @returns Paginated result list.
   */
  async getFacilityPatients(
    query: QueryPatientLinkDto,
    staff?: StaffJwtPayload,
  ): Promise<{ items: HealthProfile[]; total: number; page: number; limit: number }> {
    const targetFacilityId =
      staff && staff.facilityId ? staff.facilityId : query.facilityId;

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.healthProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.facility', 'facility')
      .leftJoinAndSelect('profile.profileChronicDisease', 'pcd');

    if (targetFacilityId) {
      qb.andWhere('profile.facilityId = :facilityId', {
        facilityId: targetFacilityId,
      });
    }

    if (query.status) {
      qb.andWhere('profile.linkStatus = :status', { status: query.status });
    }

    if (query.search) {
      const kw = `%${query.search.trim()}%`;
      qb.andWhere(
        '(profile.fullName ILIKE :kw OR profile.phoneNumber ILIKE :kw OR profile.citizenId ILIKE :kw OR profile.hospitalPatientCode ILIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('profile.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Sends a linking request from Facility to a Patient App Account via phone number.
   * Sets PENDING status on the health profile and triggers an SSE invitation to the patient.
   *
   * @param dto - Request payload containing healthProfileId and phoneNumber.
   * @param staff - Current authenticated staff.
   * @returns HealthProfile in PENDING state.
   */
  async requestLink(
    dto: RequestPatientLinkDto,
    staff: StaffJwtPayload,
  ): Promise<HealthProfile> {
    if (!staff.facilityId) {
      throw new Forbidden(
        ErrorCode.FACILITY_ACCESS_DENIED,
        'Tài khoản nhân viên y tế chưa được liên kết với cơ sở y tế nào để thực hiện gửi yêu cầu',
      );
    }

    const facility = await this.facilitiesService.getFacilityById(staff.facilityId);
    const profile = await this.healthProfilesService.getProfileById(dto.healthProfileId);

    const cleanPhone = dto.phoneNumber.trim();
    const account = await this.accountRepository.findOne({
      where: { phoneNumber: cleanPhone },
    });

    if (!account) {
      throw new NotFound(
        ErrorCode.ACCOUNT_NOT_FOUND,
        `Không tìm thấy tài khoản người dùng ứng dụng ứng với số điện thoại ${cleanPhone}`,
      );
    }

    if (
      profile.facilityId === staff.facilityId &&
      profile.isLinked &&
      profile.linkStatus === FacilityPatientLinkStatus.ACTIVE
    ) {
      throw new Conflict(
        ErrorCode.PATIENT_ALREADY_LINKED,
        `Hồ sơ sức khỏe "${profile.fullName}" đã có liên kết đang hoạt động với cơ sở y tế này`,
      );
    }

    profile.facilityId = staff.facilityId;
    profile.linkStatus = FacilityPatientLinkStatus.PENDING;
    profile.isLinked = false;
    if (!profile.hospitalPatientCode) {
      profile.hospitalPatientCode = this.generatePatientCode();
    }
    profile.linkedAt = new Date();

    const savedProfile = await this.healthProfileRepository.save(profile);

    // Emit real-time SSE invitation to patient
    this.sseService.emitInvitation(account.id, {
      linkId: savedProfile.id,
      facilityId: facility.id,
      facilityName: facility.facilityName,
      healthProfileId: profile.id,
      hospitalPatientCode: savedProfile.hospitalPatientCode,
    });

    return savedProfile;
  }

  /**
   * Gets pending invitations for authenticated mobile app user.
   * Matches either by profile.accountId or by account phoneNumber.
   *
   * @param accountId - Authenticated App Account ID
   * @returns List of pending invitation profiles
   */
  async getMyInvitations(accountId: string): Promise<HealthProfile[]> {
    const account = await this.accountRepository.findOne({ where: { id: accountId } });
    const userPhone = account?.phoneNumber;

    const qb = this.healthProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.facility', 'facility')
      .where('profile.linkStatus = :status', { status: FacilityPatientLinkStatus.PENDING });

    if (userPhone) {
      qb.andWhere('(profile.accountId = :accountId OR profile.phoneNumber = :userPhone)', {
        accountId,
        userPhone,
      });
    } else {
      qb.andWhere('profile.accountId = :accountId', { accountId });
    }

    return qb.orderBy('profile.createdAt', 'DESC').getMany();
  }

  /**
   * Gets active facility links for authenticated mobile app user.
   *
   * @param accountId - Authenticated App Account ID
   * @returns List of active linked profiles
   */
  async getMyLinks(accountId: string): Promise<HealthProfile[]> {
    return this.healthProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.facility', 'facility')
      .where('profile.accountId = :accountId', { accountId })
      .andWhere('profile.isLinked = :isLinked', { isLinked: true })
      .andWhere('profile.linkStatus = :status', { status: FacilityPatientLinkStatus.ACTIVE })
      .orderBy('profile.linkedAt', 'DESC')
      .getMany();
  }

  /**
   * Accepts a pending facility link invitation from mobile app.
   * Sets isLinked = true, linkStatus = ACTIVE, and binds accountId.
   *
   * @param id - Profile UUID
   * @param accountId - Authenticated App Account ID
   * @returns Updated HealthProfile
   */
  async acceptInvitation(id: string, accountId: string): Promise<HealthProfile> {
    const profile = await this.healthProfileRepository.findOne({
      where: { id },
      relations: ['facility'],
    });

    if (!profile) {
      throw new NotFound(
        ErrorCode.PATIENT_LINK_NOT_FOUND,
        `Không tìm thấy lời mời liên kết y tế với mã ID: ${id}`,
      );
    }

    const account = await this.accountRepository.findOne({ where: { id: accountId } });
    const isOwner =
      profile.accountId === accountId ||
      (account && profile.phoneNumber === account.phoneNumber);

    if (!isOwner) {
      throw new Forbidden(
        ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
        'Bạn không có quyền chấp nhận lời mời liên kết cho hồ sơ sức khỏe này do không trùng khớp tài khoản hoặc số điện thoại',
      );
    }

    profile.accountId = accountId;
    profile.isLinked = true;
    profile.linkStatus = FacilityPatientLinkStatus.ACTIVE;
    profile.linkedAt = new Date();
    const updated = await this.healthProfileRepository.save(profile);

    this.sseService.emitStatusChange(accountId, {
      linkId: profile.id,
      facilityId: profile.facilityId,
      status: FacilityPatientLinkStatus.ACTIVE,
    });

    return updated;
  }

  /**
   * Rejects a pending facility link invitation from mobile app.
   *
   * @param id - Profile UUID
   * @param accountId - Authenticated App Account ID
   * @returns Success response
   */
  async rejectInvitation(id: string, accountId: string): Promise<{ success: boolean; message: string }> {
    const profile = await this.healthProfileRepository.findOne({
      where: { id },
      relations: ['facility'],
    });

    if (!profile) {
      throw new NotFound(
        ErrorCode.PATIENT_LINK_NOT_FOUND,
        `Không tìm thấy lời mời liên kết y tế với mã ID: ${id}`,
      );
    }

    const account = await this.accountRepository.findOne({ where: { id: accountId } });
    const isOwner =
      profile.accountId === accountId ||
      (account && profile.phoneNumber === account.phoneNumber);

    if (!isOwner) {
      throw new Forbidden(
        ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
        'Bạn không có quyền từ chối lời mời liên kết cho hồ sơ sức khỏe này do không trùng khớp tài khoản hoặc số điện thoại',
      );
    }

    profile.isLinked = false;
    profile.linkStatus = FacilityPatientLinkStatus.UNLINKED;
    await this.healthProfileRepository.save(profile);

    this.sseService.emitStatusChange(accountId, {
      linkId: profile.id,
      facilityId: profile.facilityId,
      status: FacilityPatientLinkStatus.UNLINKED,
    });

    return {
      success: true,
      message: 'Invitation rejected successfully',
    };
  }

  /**
   * Finds profile/link by ID.
   *
   * @param id - Profile UUID.
   * @returns HealthProfile entity.
   */
  async getLinkById(id: string): Promise<HealthProfile> {
    const profile = await this.healthProfileRepository.findOne({
      where: { id },
      relations: ['facility'],
    });

    if (!profile) {
      throw new NotFound(
        ErrorCode.PATIENT_LINK_NOT_FOUND,
        `Không tìm thấy thông tin liên kết y tế với mã ID: ${id}`,
      );
    }

    return profile;
  }

  /**
   * Updates link status or hospital patient code.
   *
   * @param id - Profile UUID.
   * @param dto - Update payload.
   * @param staff - Staff context.
   * @returns Updated HealthProfile.
   */
  async updateLink(
    id: string,
    dto: UpdatePatientLinkDto,
    staff?: StaffJwtPayload,
  ): Promise<HealthProfile> {
    const profile = await this.getLinkById(id);

    if (staff && staff.facilityId && profile.facilityId !== staff.facilityId) {
      throw new Forbidden(
        ErrorCode.FACILITY_ACCESS_DENIED,
        'Bạn không có quyền chỉnh sửa thông tin liên kết của cơ sở y tế khác',
      );
    }

    if (dto.hospitalPatientCode !== undefined) {
      profile.hospitalPatientCode = dto.hospitalPatientCode;
    }

    if (dto.status !== undefined) {
      profile.linkStatus = dto.status;
      profile.isLinked = dto.status === FacilityPatientLinkStatus.ACTIVE && Boolean(profile.accountId);
    }

    return this.healthProfileRepository.save(profile);
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
    const profile = await this.healthProfileRepository.findOne({
      where: { id: healthProfileId, facilityId },
    });

    if (!profile) {
      throw new NotFound(
        ErrorCode.PATIENT_LINK_NOT_FOUND,
        `Không tìm thấy liên kết giữa cơ sở y tế (ID: ${facilityId}) và hồ sơ sức khỏe (ID: ${healthProfileId})`,
      );
    }

    profile.isLinked = false;
    profile.linkStatus = FacilityPatientLinkStatus.UNLINKED;
    await this.healthProfileRepository.save(profile);

    return { success: true };
  }
}
