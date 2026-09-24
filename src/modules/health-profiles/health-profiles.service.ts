import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthProfile } from './entities/health-profile.entity';
import { Account } from '@/modules/accounts/entities/account.entity';
import {
  CreateFacilityHealthProfileDto,
  CreateHealthProfileDto,
  QueryHealthProfileDto,
  QueryProfileListDto,
  UpdateHealthProfileDto,
} from './dtos';
import {
  Conflict,
  Forbidden,
  NotFound,
  ErrorCode,
} from '@/commons/exceptions';
import { CareSubscriptionStatus, FacilityPatientLinkStatus, ProfileRelationship, StaffRole } from '@/commons/enums/vndoctor.enum';
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { AuthUserContext } from '@/commons/decorators/current-auth-user.decorator';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';

@Injectable()
export class HealthProfilesService {
  constructor(
    @InjectRepository(HealthProfile)
    private readonly healthProfileRepository: Repository<HealthProfile>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(PatientCareSubscription)
    private readonly careSubscriptionRepository: Repository<PatientCareSubscription>,
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
   * Creates a new Health Profile for an App Account.
   *
   * @param dto - Health Profile data for App User.
   * @param accountId - Authenticated App Account UUID.
   * @returns Newly created HealthProfile.
   */
  async createAppProfile(
    dto: CreateHealthProfileDto,
    accountId: string,
  ): Promise<HealthProfile> {
    // 1. If relationship is SELF, check if account already has a SELF profile
    if (dto.relationship === ProfileRelationship.SELF) {
      const existingSelf = await this.healthProfileRepository.findOne({
        where: { accountId, relationship: ProfileRelationship.SELF },
      });
      if (existingSelf) {
        throw new Conflict(
          ErrorCode.RESOURCE_ALREADY_EXISTS,
          'Tài khoản này đã có hồ sơ sức khỏe cá nhân (chính chủ / SELF), không thể tạo thêm',
        );
      }
    }

    // 2. Create profile
    const profile = this.healthProfileRepository.create({
      relationship: dto.relationship,
      fullName: dto.fullName,
      dob: dto.dob,
      gender: dto.gender,
      citizenId: dto.citizenId,
      phoneNumber: dto.phoneNumber,
      address: dto.address,
      bloodType: dto.bloodType,
      allergy: dto.allergy,
      medicalHistory: dto.medicalHistory,
      height: dto.height ?? null,
      weight: dto.weight ?? null,
      isSmoking: dto.isSmoking ?? false,
      hasHypertension: dto.hasHypertension ?? false,
      hasDyslipidemia: dto.hasDyslipidemia ?? false,
      hasDiabetes: dto.hasDiabetes ?? false,
      hasStroke: dto.hasStroke ?? false,
      hasMyocardialInfarction: dto.hasMyocardialInfarction ?? false,
      hasAcuteCoronarySyndrome: dto.hasAcuteCoronarySyndrome ?? false,
      hasCoronaryArteryDisease: dto.hasCoronaryArteryDisease ?? false,
      hasTia: dto.hasTia ?? false,
      hasAorticAneurysm: dto.hasAorticAneurysm ?? false,
      hasPeripheralArteryDisease: dto.hasPeripheralArteryDisease ?? false,
      hasAtherosclerosis: dto.hasAtherosclerosis ?? false,
      hasFamilialHypercholesterolemia: dto.hasFamilialHypercholesterolemia ?? false,
      accountId,
      facilityId: null,
      isLinked: false,
      linkStatus: FacilityPatientLinkStatus.NOT_LINKED,
      hospitalPatientCode: null,
    });

    const savedProfile = await this.healthProfileRepository.save(profile);
    return this.getProfileById(savedProfile.id);
  }

  /**
   * Creates a new Health Profile independently by Staff at a Medical Facility.
   * Does NOT require an App Account, assigns facilityId and generates a hospitalPatientCode.
   * isLinked is false until linked/accepted with an App Account.
   *
   * @param dto - Facility Health Profile data.
   * @param staff - Authenticated Staff context.
   * @returns Newly created HealthProfile.
   */
  async createFacilityProfile(
    dto: CreateFacilityHealthProfileDto,
    staff: StaffJwtPayload,
  ): Promise<HealthProfile> {
    if (!staff.facilityId) {
      throw new Forbidden(
        ErrorCode.FACILITY_ACCESS_DENIED,
        'Tài khoản nhân viên y tế chưa được liên kết với cơ sở y tế để tạo hồ sơ',
      );
    }

    // Create profile at facility: accountId is always null until the patient explicitly accepts the link invitation on App
    const profile = this.healthProfileRepository.create({
      relationship: dto.relationship || ProfileRelationship.OTHER,
      fullName: dto.fullName,
      dob: dto.dob,
      gender: dto.gender,
      citizenId: dto.citizenId,
      phoneNumber: dto.phoneNumber,
      address: dto.address,
      bloodType: dto.bloodType,
      allergy: dto.allergy,
      medicalHistory: dto.medicalHistory,
      height: dto.height ?? null,
      weight: dto.weight ?? null,
      isSmoking: dto.isSmoking ?? false,
      hasHypertension: dto.hasHypertension ?? false,
      hasDyslipidemia: dto.hasDyslipidemia ?? false,
      hasDiabetes: dto.hasDiabetes ?? false,
      hasStroke: dto.hasStroke ?? false,
      hasMyocardialInfarction: dto.hasMyocardialInfarction ?? false,
      hasAcuteCoronarySyndrome: dto.hasAcuteCoronarySyndrome ?? false,
      hasCoronaryArteryDisease: dto.hasCoronaryArteryDisease ?? false,
      hasTia: dto.hasTia ?? false,
      hasAorticAneurysm: dto.hasAorticAneurysm ?? false,
      hasPeripheralArteryDisease: dto.hasPeripheralArteryDisease ?? false,
      hasAtherosclerosis: dto.hasAtherosclerosis ?? false,
      hasFamilialHypercholesterolemia: dto.hasFamilialHypercholesterolemia ?? false,
      accountId: null,
      facilityId: staff.facilityId,
      isLinked: false,
      linkStatus: FacilityPatientLinkStatus.NOT_LINKED,
      hospitalPatientCode: this.generatePatientCode(),
      linkedAt: null,
    });

    const savedProfile = await this.healthProfileRepository.save(profile);
    return this.getProfileById(savedProfile.id);
  }

  /**
   * Retrieves all Health Profiles belonging to an App Account.
   *
   * @param accountId - Owning Account UUID.
   * @returns Array of HealthProfile objects with facility & care subscriptions.
   */
  async getMyProfiles(accountId: string): Promise<HealthProfile[]> {
    const profiles = await this.healthProfileRepository.find({
      where: { accountId },
      relations: [
        'facility',
        'careSubscriptions',
        'careSubscriptions.carePackage',
        'careSubscriptions.assignedDoctor',
        'careSubscriptions.assignedNurse',
        'careSubscriptions.assignedExpert',
      ],
      order: { relationship: 'ASC', createdAt: 'ASC' },
    });

    for (const profile of profiles) {
      if (profile.careSubscriptions && profile.careSubscriptions.length > 0) {
        profile.careSubscriptions.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const activeSub =
          profile.careSubscriptions.find(
            (s) => s.status === CareSubscriptionStatus.ACTIVE,
          ) || profile.careSubscriptions[0];

        if (activeSub) {
          profile.subscription = {
            id: activeSub.id,
            status: activeSub.status,
            startedAt: activeSub.startedAt,
            expiresAt: activeSub.expiresAt,
            carePackage: activeSub.carePackage,
            assignedDoctor: activeSub.assignedDoctor,
            assignedNurse: activeSub.assignedNurse,
            assignedExpert: activeSub.assignedExpert,
            createdAt: activeSub.createdAt,
            updatedAt: activeSub.updatedAt,
          };
        } else {
          profile.subscription = null;
        }
      } else {
        profile.subscription = null;
        profile.careSubscriptions = [];
      }
    }

    return profiles;
  }

  /**
   * Finds a Health Profile by UUID.
   *
   * @param id - Profile UUID.
   * @param userOrAccountId - Optional authenticated user context or account ID for ownership/facility verification.
   * @returns HealthProfile entity.
   */
  async getProfileById(
    id: string,
    userOrAccountId?: AuthUserContext | string,
  ): Promise<HealthProfile> {
    const profile = await this.healthProfileRepository.findOne({
      where: { id },
      relations: [
        'facility',
        'careSubscriptions',
        'careSubscriptions.carePackage',
        'careSubscriptions.assignedDoctor',
        'careSubscriptions.assignedNurse',
        'careSubscriptions.assignedExpert',
      ],
    });

    if (!profile) {
      throw new NotFound(
        ErrorCode.HEALTH_PROFILE_NOT_FOUND,
        `Không tìm thấy hồ sơ sức khỏe với mã ID: ${id}`,
      );
    }

    if (profile.careSubscriptions && profile.careSubscriptions.length > 0) {
      profile.careSubscriptions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const activeSub =
        profile.careSubscriptions.find(
          (s) => s.status === CareSubscriptionStatus.ACTIVE,
        ) || profile.careSubscriptions[0];

      if (activeSub) {
        profile.subscription = {
          id: activeSub.id,
          status: activeSub.status,
          startedAt: activeSub.startedAt,
          expiresAt: activeSub.expiresAt,
          carePackage: activeSub.carePackage,
          assignedDoctor: activeSub.assignedDoctor,
          assignedNurse: activeSub.assignedNurse,
          assignedExpert: activeSub.assignedExpert,
          createdAt: activeSub.createdAt,
          updatedAt: activeSub.updatedAt,
        };
      } else {
        profile.subscription = null;
      }
    } else {
      profile.subscription = null;
      profile.careSubscriptions = [];
    }

    if (userOrAccountId) {
      if (typeof userOrAccountId === 'string') {
        if (profile.accountId !== userOrAccountId) {
          throw new Forbidden(
            ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
            'Bạn không có quyền truy cập hồ sơ sức khỏe của người dùng khác',
          );
        }
      } else if (userOrAccountId.type === 'APP_ACCOUNT') {
        if (profile.accountId !== userOrAccountId.userId) {
          throw new Forbidden(
            ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
            'Bạn không có quyền truy cập hồ sơ sức khỏe của người dùng khác',
          );
        }
      } else if (userOrAccountId.type === 'STAFF') {
        const staff = userOrAccountId.staff;
        if (
          staff?.role !== StaffRole.VNDOCTOR_ADMIN &&
          userOrAccountId.facilityId &&
          profile.facilityId &&
          profile.facilityId !== userOrAccountId.facilityId
        ) {
          throw new Forbidden(
            ErrorCode.FACILITY_ACCESS_DENIED,
            'Hồ sơ sức khỏe này chưa được liên kết với cơ sở y tế của bạn',
          );
        }
      }
    }

    return profile;
  }

  /**
   * Retrieves paginated health profiles linked to a medical facility.
   * Enforces facility isolation: Staff can only view health profiles linked to their own facility.
   *
   * @param query - Filter parameters.
   * @param staff - Authenticated Staff context.
   * @returns Paginated list of HealthProfile objects.
   */
  async getFacilityProfiles(
    query: QueryHealthProfileDto,
    staff?: StaffJwtPayload,
  ): Promise<{ items: HealthProfile[]; total: number; page: number; limit: number }> {
    let targetFacilityId = query.facilityId;

    if (staff && staff.facilityId) {
      if (query.facilityId && query.facilityId !== staff.facilityId && staff.role !== StaffRole.VNDOCTOR_ADMIN) {
        throw new Forbidden(
          ErrorCode.FACILITY_ACCESS_DENIED,
          'Bạn không có quyền xem danh sách bệnh nhân của cơ sở y tế khác',
        );
      }
      if (staff.role !== StaffRole.VNDOCTOR_ADMIN) {
        targetFacilityId = staff.facilityId;
      }
    }

    if (!targetFacilityId && staff?.role !== StaffRole.VNDOCTOR_ADMIN) {
      throw new Forbidden(
        ErrorCode.FACILITY_ACCESS_DENIED,
        'Yêu cầu xác thực cơ sở y tế để lấy danh sách bệnh nhân',
      );
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.healthProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.facility', 'facility');

    if (targetFacilityId) {
      qb.andWhere('profile.facilityId = :facilityId', { facilityId: targetFacilityId });
    }

    if (query.linkStatus) {
      qb.andWhere('profile.linkStatus = :linkStatus', { linkStatus: query.linkStatus });
    }

    if (query.accountId) {
      qb.andWhere('profile.accountId = :accountId', { accountId: query.accountId });
    }

    if (query.relationship) {
      qb.andWhere('profile.relationship = :relationship', {
        relationship: query.relationship,
      });
    }

    if (query.citizenId) {
      qb.andWhere('profile.citizenId = :citizenId', { citizenId: query.citizenId.trim() });
    }

    if (query.phoneNumber) {
      qb.andWhere('profile.phoneNumber = :phoneNumber', { phoneNumber: query.phoneNumber.trim() });
    }

    if (query.search) {
      const kw = `%${query.search.trim()}%`;
      qb.andWhere(
        '(profile.fullName ILIKE :kw OR profile.citizenId ILIKE :kw OR profile.phoneNumber ILIKE :kw OR profile.hospitalPatientCode ILIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('profile.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Retrieves paginated health profiles that have subscribed to a care package and have an assigned doctor.
   * Enables doctors to manage patient profiles under their direct care / assignment.
   *
   * @param query - Filter criteria (doctorId, facilityId, carePackageId, subscriptionStatus, search, page, limit).
   * @param staff - Authenticated Staff context (Doctor, Nurse, Admin).
   * @returns Paginated list of HealthProfile objects enriched with subscription & doctor details.
   */
  async getProfileList(
    query: QueryProfileListDto,
    staff?: StaffJwtPayload,
  ): Promise<{
    items: HealthProfile[];
    total: number;
    page: number;
    limit: number;
  }> {
    let targetFacilityId = query.facilityId;
    let targetDoctorId = query.doctorId;

    // 1. Facility & Doctor access controls
    if (staff) {
      // If caller is a DOCTOR, enforce their own doctorId by default
      if (staff.role === StaffRole.DOCTOR) {
        if (query.doctorId && query.doctorId !== staff.id) {
          throw new Forbidden(
            ErrorCode.FACILITY_ACCESS_DENIED,
            'Bác sĩ chỉ có quyền xem danh sách hồ sơ bệnh nhân được phân công cho chính mình',
          );
        }
        targetDoctorId = staff.id;
      }

      // Facility isolation: staff can only see data within their facility (unless VNDOCTOR_ADMIN)
      if (staff.facilityId) {
        if (query.facilityId && query.facilityId !== staff.facilityId && staff.role !== StaffRole.VNDOCTOR_ADMIN) {
          throw new Forbidden(
            ErrorCode.FACILITY_ACCESS_DENIED,
            'Bạn không có quyền xem danh sách bệnh nhân của cơ sở y tế khác',
          );
        }
        if (staff.role !== StaffRole.VNDOCTOR_ADMIN) {
          targetFacilityId = staff.facilityId;
        }
      }
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.careSubscriptionRepository
      .createQueryBuilder('sub')
      .innerJoinAndSelect('sub.healthProfile', 'profile')
      .innerJoinAndSelect('sub.carePackage', 'carePackage')
      .leftJoinAndSelect('sub.assignedDoctor', 'assignedDoctor')
      .leftJoinAndSelect('sub.assignedNurse', 'assignedNurse')
      .leftJoinAndSelect('sub.assignedExpert', 'assignedExpert')
      .leftJoinAndSelect('profile.facility', 'facility')
      .where('sub.assignedDoctorId IS NOT NULL');

    if (targetDoctorId) {
      qb.andWhere('sub.assignedDoctorId = :targetDoctorId', { targetDoctorId });
    }

    if (targetFacilityId) {
      qb.andWhere('carePackage.facilityId = :targetFacilityId', { targetFacilityId });
    }

    if (query.carePackageId) {
      qb.andWhere('sub.carePackageId = :carePackageId', { carePackageId: query.carePackageId });
    }

    if (query.subscriptionStatus) {
      qb.andWhere('sub.status = :subscriptionStatus', {
        subscriptionStatus: query.subscriptionStatus,
      });
    }

    if (query.search) {
      const kw = `%${query.search.trim()}%`;
      qb.andWhere(
        '(profile.fullName ILIKE :kw OR profile.citizenId ILIKE :kw OR profile.phoneNumber ILIKE :kw OR carePackage.packageName ILIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('sub.createdAt', 'DESC').skip(skip).take(limit);

    const [subscriptions, total] = await qb.getManyAndCount();

    const items = subscriptions.map((sub) => {
      const profile = sub.healthProfile!;
      profile.subscription = {
        id: sub.id,
        status: sub.status,
        startedAt: sub.startedAt,
        expiresAt: sub.expiresAt,
        carePackage: sub.carePackage,
        assignedDoctor: sub.assignedDoctor,
        assignedNurse: sub.assignedNurse,
        assignedExpert: sub.assignedExpert,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      };
      return profile;
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Queries profiles (Used by staff / admin or multi-profile search).
   *
   * @param query - Filter criteria.
   * @returns Paginated result list.
   */
  async getProfiles(
    query: QueryHealthProfileDto,
  ): Promise<{ items: HealthProfile[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.healthProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.facility', 'facility');

    if (query.facilityId) {
      qb.andWhere('profile.facilityId = :facilityId', { facilityId: query.facilityId });
    }

    if (query.linkStatus) {
      qb.andWhere('profile.linkStatus = :linkStatus', { linkStatus: query.linkStatus });
    }

    if (query.accountId) {
      qb.andWhere('profile.accountId = :accountId', { accountId: query.accountId });
    }

    if (query.relationship) {
      qb.andWhere('profile.relationship = :relationship', {
        relationship: query.relationship,
      });
    }

    if (query.citizenId) {
      qb.andWhere('profile.citizenId = :citizenId', { citizenId: query.citizenId.trim() });
    }

    if (query.phoneNumber) {
      qb.andWhere('profile.phoneNumber = :phoneNumber', { phoneNumber: query.phoneNumber.trim() });
    }

    if (query.search) {
      const kw = `%${query.search.trim()}%`;
      qb.andWhere('(profile.fullName ILIKE :kw OR profile.citizenId ILIKE :kw OR profile.phoneNumber ILIKE :kw OR profile.hospitalPatientCode ILIKE :kw)', {
        kw,
      });
    }

    qb.orderBy('profile.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Updates an existing Health Profile by App Account owner or Staff.
   *
   * @param id - Profile UUID.
   * @param dto - Updated fields.
   * @param userOrAccountId - Optional authenticated user context or account ID for ownership validation.
   * @returns Updated HealthProfile.
   */
  async updateProfile(
    id: string,
    dto: UpdateHealthProfileDto,
    userOrAccountId?: AuthUserContext | string,
  ): Promise<HealthProfile> {
    const profile = await this.getProfileById(id, userOrAccountId);

    // If changing to SELF relationship, ensure no other SELF profile exists
    if (
      dto.relationship === ProfileRelationship.SELF &&
      profile.relationship !== ProfileRelationship.SELF &&
      profile.accountId
    ) {
      const existingSelf = await this.healthProfileRepository.findOne({
        where: { accountId: profile.accountId, relationship: ProfileRelationship.SELF },
      });
      if (existingSelf && existingSelf.id !== id) {
        throw new Conflict(
          ErrorCode.RESOURCE_ALREADY_EXISTS,
          'Tài khoản này đã có hồ sơ sức khỏe cá nhân (chính chủ / SELF) khác, không thể chuyển hồ sơ này sang SELF',
        );
      }
    }

    // Update entity fields safely
    if (dto.relationship !== undefined) profile.relationship = dto.relationship;
    if (dto.fullName !== undefined) profile.fullName = dto.fullName;
    if (dto.dob !== undefined) profile.dob = dto.dob;
    if (dto.gender !== undefined) profile.gender = dto.gender;
    if (dto.citizenId !== undefined) profile.citizenId = dto.citizenId;
    if (dto.phoneNumber !== undefined) profile.phoneNumber = dto.phoneNumber;
    if (dto.address !== undefined) profile.address = dto.address;
    if (dto.bloodType !== undefined) profile.bloodType = dto.bloodType;
    if (dto.allergy !== undefined) profile.allergy = dto.allergy;
    if (dto.medicalHistory !== undefined) profile.medicalHistory = dto.medicalHistory;
    if (dto.height !== undefined) profile.height = dto.height;
    if (dto.weight !== undefined) profile.weight = dto.weight;
    if (dto.isSmoking !== undefined) profile.isSmoking = dto.isSmoking;
    if (dto.hasHypertension !== undefined) profile.hasHypertension = dto.hasHypertension;
    if (dto.hasDyslipidemia !== undefined) profile.hasDyslipidemia = dto.hasDyslipidemia;
    if (dto.hasDiabetes !== undefined) profile.hasDiabetes = dto.hasDiabetes;
    if (dto.hasStroke !== undefined) profile.hasStroke = dto.hasStroke;
    if (dto.hasMyocardialInfarction !== undefined) profile.hasMyocardialInfarction = dto.hasMyocardialInfarction;
    if (dto.hasAcuteCoronarySyndrome !== undefined) profile.hasAcuteCoronarySyndrome = dto.hasAcuteCoronarySyndrome;
    if (dto.hasCoronaryArteryDisease !== undefined) profile.hasCoronaryArteryDisease = dto.hasCoronaryArteryDisease;
    if (dto.hasTia !== undefined) profile.hasTia = dto.hasTia;
    if (dto.hasAorticAneurysm !== undefined) profile.hasAorticAneurysm = dto.hasAorticAneurysm;
    if (dto.hasPeripheralArteryDisease !== undefined) profile.hasPeripheralArteryDisease = dto.hasPeripheralArteryDisease;
    if (dto.hasAtherosclerosis !== undefined) profile.hasAtherosclerosis = dto.hasAtherosclerosis;
    if (dto.hasFamilialHypercholesterolemia !== undefined) profile.hasFamilialHypercholesterolemia = dto.hasFamilialHypercholesterolemia;

    await this.healthProfileRepository.save(profile);
    return this.getProfileById(id);
  }

  /**
   * Soft deletes a Health Profile.
   *
   * @param id - Profile UUID.
   * @param userOrAccountId - Authenticated user context or account ID.
   */
  async deleteProfile(
    id: string,
    userOrAccountId?: AuthUserContext | string,
  ): Promise<{ success: boolean }> {
    const profile = await this.getProfileById(id, userOrAccountId);
    await this.healthProfileRepository.softRemove(profile);
    return { success: true };
  }
}

