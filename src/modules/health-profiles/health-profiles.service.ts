import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthProfile } from './entities/health-profile.entity';
import {
  CreateHealthProfileDto,
  QueryHealthProfileDto,
  UpdateHealthProfileDto,
} from './dtos';
import {
  Conflict,
  Forbidden,
  NotFound,
} from '@/commons/exceptions';
import { ProfileRelationship } from '@/commons/enums/vndoctor.enum';
import { ChronicDiseasesService } from '@/modules/chronic-diseases/chronic-diseases.service';

@Injectable()
export class HealthProfilesService {
  constructor(
    @InjectRepository(HealthProfile)
    private readonly healthProfileRepository: Repository<HealthProfile>,
    private readonly chronicDiseasesService: ChronicDiseasesService,
  ) {}

  /**
   * Creates a new Health Profile for an App Account.
   *
   * @param dto - Health Profile data.
   * @param accountId - Owning Account UUID.
   * @returns Newly created HealthProfile.
   */
  async createProfile(
    dto: CreateHealthProfileDto,
    accountId: string,
  ): Promise<HealthProfile> {
    // 1. If relationship is SELF, check if account already has a SELF profile
    if (dto.relationship === ProfileRelationship.SELF) {
      const existingSelf = await this.healthProfileRepository.findOne({
        where: { accountId, relationship: ProfileRelationship.SELF },
      });
      if (existingSelf) {
        throw new Conflict('Tài khoản đã có hồ sơ sức khỏe cá nhân (SELF)');
      }
    }

    // 2. Create profile
    const profile = this.healthProfileRepository.create({
      ...dto,
      accountId,
    });

    const savedProfile = await this.healthProfileRepository.save(profile);

    // 3. Attach chronic diseases if provided
    if (dto.chronicDiseaseIds && dto.chronicDiseaseIds.length > 0) {
      await this.chronicDiseasesService.setProfileDiseases(
        savedProfile.id,
        dto.chronicDiseaseIds,
      );
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
   * @param accountId - Optional account ID for ownership verification.
   * @returns HealthProfile entity.
   */
  async getProfileById(id: string, accountId?: string): Promise<HealthProfile> {
    const profile = await this.healthProfileRepository.findOne({
      where: { id },
      relations: ['profileChronicDisease', 'facilityLinks', 'facilityLinks.facility'],
    });

    if (!profile) {
      throw new NotFound(`Không tìm thấy hồ sơ sức khỏe với ID ${id}`);
    }

    if (accountId && profile.accountId !== accountId) {
      throw new Forbidden('Bạn không có quyền truy cập hồ sơ sức khỏe này');
    }

    return profile;
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
   * Updates an existing Health Profile.
   *
   * @param id - Profile UUID.
   * @param dto - Updated fields.
   * @param accountId - Optional account ID for ownership validation.
   * @returns Updated HealthProfile.
   */
  async updateProfile(
    id: string,
    dto: UpdateHealthProfileDto,
    accountId?: string,
  ): Promise<HealthProfile> {
    const profile = await this.getProfileById(id, accountId);

    // If changing to SELF relationship, ensure no other SELF profile exists
    if (
      dto.relationship === ProfileRelationship.SELF &&
      profile.relationship !== ProfileRelationship.SELF
    ) {
      const existingSelf = await this.healthProfileRepository.findOne({
        where: { accountId: profile.accountId, relationship: ProfileRelationship.SELF },
      });
      if (existingSelf && existingSelf.id !== id) {
        throw new Conflict('Tài khoản đã có hồ sơ sức khỏe cá nhân (SELF)');
      }
    }

    Object.assign(profile, dto);
    await this.healthProfileRepository.save(profile);

    // Update chronic diseases if provided
    if (dto.chronicDiseaseIds !== undefined) {
      await this.chronicDiseasesService.setProfileDiseases(
        id,
        dto.chronicDiseaseIds,
      );
    }

    return this.getProfileById(id);
  }

  /**
   * Deletes a Health Profile.
   *
   * @param id - Profile UUID.
   * @param accountId - Owning Account ID.
   */
  async deleteProfile(id: string, accountId: string): Promise<{ success: boolean }> {
    const profile = await this.getProfileById(id, accountId);
    await this.healthProfileRepository.remove(profile);
    return { success: true };
  }
}
