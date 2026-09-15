import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthProfile } from './entities/health-profile.entity';
import { Account } from '@/modules/accounts/entities/account.entity';
import { FacilityPatientLink } from '@/modules/patient-links/entities/facility-patient-link.entity';
import {
  CreateHealthProfileDto,
  QueryHealthProfileDto,
  UpdateHealthProfileDto,
} from './dtos';
import {
  BadRequest,
  Conflict,
  Forbidden,
  NotFound,
  ErrorCode,
} from '@/commons/exceptions';
import { FacilityPatientLinkStatus, ProfileRelationship, StaffRole } from '@/commons/enums/vndoctor.enum';
import { ChronicDiseasesService } from '@/modules/chronic-diseases/chronic-diseases.service';
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { AuthUserContext } from '@/commons/decorators/current-auth-user.decorator';

@Injectable()
export class HealthProfilesService {
  constructor(
    @InjectRepository(HealthProfile)
    private readonly healthProfileRepository: Repository<HealthProfile>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(FacilityPatientLink)
    private readonly linkRepository: Repository<FacilityPatientLink>,
    private readonly chronicDiseasesService: ChronicDiseasesService,
  ) {}

  /**
   * Creates a new Health Profile for an App Account or by Staff on behalf of a patient.
   *
   * @param dto - Health Profile data.
   * @param userOrAccountId - Authenticated user context (App Account or Staff) or account ID string.
   * @returns Newly created HealthProfile.
   */
  async createProfile(
    dto: CreateHealthProfileDto,
    userOrAccountId: AuthUserContext | string,
  ): Promise<HealthProfile> {
    let targetAccountId: string;
    let staffContext: AuthUserContext | undefined;

    if (typeof userOrAccountId === 'string') {
      targetAccountId = userOrAccountId;
    } else if (userOrAccountId.type === 'APP_ACCOUNT') {
      targetAccountId = userOrAccountId.userId;
    } else {
      // Authenticated as STAFF
      staffContext = userOrAccountId;
      if (dto.accountId) {
        targetAccountId = dto.accountId;
      } else if (dto.phoneNumber) {
        const existingAccount = await this.accountRepository.findOne({
          where: { phoneNumber: dto.phoneNumber.trim() },
        });
        if (existingAccount) {
          targetAccountId = existingAccount.id;
        } else {
          // Create patient account with phone number
          const newAccount = this.accountRepository.create({
            phoneNumber: dto.phoneNumber.trim(),
            passwordHash: 'PATIENT_STAFF_CREATED',
            isActive: true,
          });
          const savedAccount = await this.accountRepository.save(newAccount);
          targetAccountId = savedAccount.id;
        }
      } else {
        throw new BadRequest(ErrorCode.MISSING_REQUIRED_FIELD);
      }
    }

    // 1. If relationship is SELF, check if account already has a SELF profile
    if (dto.relationship === ProfileRelationship.SELF) {
      const existingSelf = await this.healthProfileRepository.findOne({
        where: { accountId: targetAccountId, relationship: ProfileRelationship.SELF },
      });
      if (existingSelf) {
        throw new Conflict(ErrorCode.RESOURCE_ALREADY_EXISTS);
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
      accountId: targetAccountId,
    });

    const savedProfile = await this.healthProfileRepository.save(profile);

    // 3. Attach chronic diseases if provided
    if (dto.chronicDiseaseIds && dto.chronicDiseaseIds.length > 0) {
      await this.chronicDiseasesService.setProfileDiseases(
        savedProfile.id,
        dto.chronicDiseaseIds,
      );
    }

    // 4. If created by Staff at a facility, automatically create an active link
    if (staffContext?.facilityId) {
      const existingLink = await this.linkRepository.findOne({
        where: {
          facilityId: staffContext.facilityId,
          healthProfileId: savedProfile.id,
        },
      });
      if (!existingLink) {
        const link = this.linkRepository.create({
          facilityId: staffContext.facilityId,
          healthProfileId: savedProfile.id,
          phoneNumber: dto.phoneNumber ? dto.phoneNumber.trim() : '',
          hospitalPatientCode: dto.hospitalPatientCode || null,
          status: FacilityPatientLinkStatus.ACTIVE,
          linkedAt: new Date(),
        });
        await this.linkRepository.save(link);
      }
    }

    return this.getProfileById(savedProfile.id);
  }

  /**
   * Retrieves all Health Profiles belonging to an App Account.
   *
   * @param accountId - Owning Account UUID.
   * @returns Array of HealthProfile objects with chronic diseases & facility links.
   */
  async getMyProfiles(accountId: string): Promise<HealthProfile[]> {
    return this.healthProfileRepository.find({
      where: { accountId },
      relations: ['profileChronicDisease', 'facilityLinks', 'facilityLinks.facility'],
      order: { relationship: 'ASC', createdAt: 'ASC' },
    });
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
      relations: ['profileChronicDisease', 'facilityLinks', 'facilityLinks.facility'],
    });

    if (!profile) {
      throw new NotFound(ErrorCode.HEALTH_PROFILE_NOT_FOUND);
    }

    if (userOrAccountId) {
      if (typeof userOrAccountId === 'string') {
        if (profile.accountId !== userOrAccountId) {
          throw new Forbidden(ErrorCode.HEALTH_PROFILE_ACCESS_DENIED);
        }
      } else if (userOrAccountId.type === 'APP_ACCOUNT') {
        if (profile.accountId !== userOrAccountId.userId) {
          throw new Forbidden(ErrorCode.HEALTH_PROFILE_ACCESS_DENIED);
        }
      } else if (userOrAccountId.type === 'STAFF') {
        const staff = userOrAccountId.staff;
        if (staff?.role !== StaffRole.VNDOCTOR_ADMIN && userOrAccountId.facilityId) {
          const hasLink = profile.facilityLinks?.some(
            (link) => link.facilityId === userOrAccountId.facilityId,
          );
          if (!hasLink && profile.facilityLinks && profile.facilityLinks.length > 0) {
            throw new Forbidden(ErrorCode.FACILITY_ACCESS_DENIED);
          }
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
        throw new Forbidden(ErrorCode.FACILITY_ACCESS_DENIED);
      }
      if (staff.role !== StaffRole.VNDOCTOR_ADMIN) {
        targetFacilityId = staff.facilityId;
      }
    }

    if (!targetFacilityId && staff?.role !== StaffRole.VNDOCTOR_ADMIN) {
      throw new Forbidden(ErrorCode.FACILITY_ACCESS_DENIED);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.healthProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.profileChronicDisease', 'pcd')
      .leftJoinAndSelect('profile.facilityLinks', 'facilityLinks')
      .leftJoinAndSelect('facilityLinks.facility', 'facility');

    const linkStatus = query.linkStatus || FacilityPatientLinkStatus.ACTIVE;

    if (targetFacilityId) {
      qb.innerJoin(
        'profile.facilityLinks',
        'activeLink',
        'activeLink.facilityId = :facilityId AND activeLink.status = :linkStatus',
        { facilityId: targetFacilityId, linkStatus },
      );
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
        '(profile.fullName ILIKE :kw OR profile.citizenId ILIKE :kw OR profile.phoneNumber ILIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('profile.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
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
      .leftJoinAndSelect('profile.profileChronicDisease', 'pcd')
      .leftJoinAndSelect('profile.facilityLinks', 'links');

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
      qb.andWhere('(profile.fullName ILIKE :kw OR profile.citizenId ILIKE :kw OR profile.phoneNumber ILIKE :kw)', {
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
      profile.relationship !== ProfileRelationship.SELF
    ) {
      const existingSelf = await this.healthProfileRepository.findOne({
        where: { accountId: profile.accountId, relationship: ProfileRelationship.SELF },
      });
      if (existingSelf && existingSelf.id !== id) {
        throw new Conflict(ErrorCode.RESOURCE_ALREADY_EXISTS);
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

    await this.healthProfileRepository.save(profile);

    // Update chronic diseases if provided
    if (dto.chronicDiseaseIds !== undefined) {
      await this.chronicDiseasesService.setProfileDiseases(
        id,
        dto.chronicDiseaseIds,
      );
    }

    // Update hospitalPatientCode in FacilityPatientLink if staff provided and link exists
    if (
      dto.hospitalPatientCode !== undefined &&
      userOrAccountId &&
      typeof userOrAccountId !== 'string' &&
      userOrAccountId.type === 'STAFF' &&
      userOrAccountId.facilityId
    ) {
      const link = await this.linkRepository.findOne({
        where: {
          facilityId: userOrAccountId.facilityId,
          healthProfileId: id,
        },
      });
      if (link) {
        link.hospitalPatientCode = dto.hospitalPatientCode;
        await this.linkRepository.save(link);
      }
    }

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
