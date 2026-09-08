import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { ChronicDisease } from './entities/chronic-disease.entity';
import { ProfileChronicDisease } from './entities/profile-chronic-disease.entity';
import {
  CreateChronicDiseaseDto,
  QueryChronicDiseaseDto,
  UpdateChronicDiseaseDto,
} from './dtos';
import { Conflict, NotFound } from '@/commons/exceptions';
import { LoggerService } from '@/commons/logger/logger.service';

interface IcdSeedItem {
  section?: string;
  score2Code?: string;
  name: string;
  directIcd10Code?: string;
  directIcd10Name?: string;
  relatedIcd10Codes?: string[];
}

@Injectable()
export class ChronicDiseasesService implements OnModuleInit {
  private readonly logger = new LoggerService(ChronicDiseasesService.name);

  constructor(
    @InjectRepository(ChronicDisease)
    private readonly chronicDiseaseRepository: Repository<ChronicDisease>,
    @InjectRepository(ProfileChronicDisease)
    private readonly profileChronicDiseaseRepository: Repository<ProfileChronicDisease>,
  ) {}

  async onModuleInit() {
    await this.seedInitialChronicDiseases();
  }

  /**
   * Seeds master catalogue of chronic diseases from JSON if empty.
   */
  private async seedInitialChronicDiseases(): Promise<void> {
    try {
      const count = await this.chronicDiseaseRepository.count();
      if (count > 0) {
        return;
      }

      const seedFilePath = path.join(
        process.cwd(),
        'src/database/seeds/data/icd10-score2-dictionary.json',
      );

      if (!fs.existsSync(seedFilePath)) {
        this.logger.warn(`Seed file not found at ${seedFilePath}, skipping seed.`);
        return;
      }

      const rawData = fs.readFileSync(seedFilePath, 'utf8');
      const seedItems = JSON.parse(rawData) as unknown as IcdSeedItem[];

      const entities: ChronicDisease[] = seedItems.map((item, index) => {
        const code = (item.score2Code
          ? `SCORE2_${item.score2Code.replace(/\./g, '_')}`
          : `DISEASE_${index + 1}`
        ).toUpperCase();

        return this.chronicDiseaseRepository.create({
          code,
          name: item.name,
          icd10Code: item.directIcd10Code || null,
          category: item.section || 'Khác',
          isActive: true,
          displayOrder: index + 1,
        });
      });

      await this.chronicDiseaseRepository.save(entities);
      this.logger.log(`Seeded ${entities.length} chronic diseases successfully.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to seed chronic diseases: ${message}`);
    }
  }

  /**
   * Retrieves paginated list of chronic diseases.
   *
   * @param query - Search and filter parameters.
   * @returns Paginated items and total count.
   */
  async getChronicDiseases(
    query: QueryChronicDiseaseDto,
  ): Promise<{ items: ChronicDisease[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const qb = this.chronicDiseaseRepository.createQueryBuilder('cd');

    if (query.search) {
      const kw = `%${query.search.trim()}%`;
      qb.where('(cd.name ILIKE :kw OR cd.code ILIKE :kw OR cd.icd10Code ILIKE :kw)', {
        kw,
      });
    }

    if (query.category) {
      qb.andWhere('cd.category = :category', { category: query.category });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('cd.isActive = :isActive', { isActive: query.isActive });
    }

    qb.orderBy('cd.displayOrder', 'ASC').addOrderBy('cd.createdAt', 'ASC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Finds a chronic disease by ID.
   *
   * @param id - Disease UUID.
   * @returns Chronic disease entity.
   */
  async getChronicDiseaseById(id: string): Promise<ChronicDisease> {
    const disease = await this.chronicDiseaseRepository.findOne({ where: { id } });
    if (!disease) {
      throw new NotFound(`Không tìm thấy bệnh mạn tính với ID ${id}`);
    }
    return disease;
  }

  /**
   * Creates a new master chronic disease entry.
   *
   * @param dto - Disease data.
   * @returns Newly created disease.
   */
  async createChronicDisease(dto: CreateChronicDiseaseDto): Promise<ChronicDisease> {
    const existing = await this.chronicDiseaseRepository.findOne({
      where: { code: dto.code.trim().toUpperCase() },
    });

    if (existing) {
      throw new Conflict(`Mã bệnh mạn tính ${dto.code} đã tồn tại`);
    }

    const disease = this.chronicDiseaseRepository.create({
      ...dto,
      code: dto.code.trim().toUpperCase(),
    });

    return this.chronicDiseaseRepository.save(disease);
  }

  /**
   * Updates a master chronic disease entry.
   *
   * @param id - Disease UUID.
   * @param dto - Update payload.
   * @returns Updated disease.
   */
  async updateChronicDisease(
    id: string,
    dto: UpdateChronicDiseaseDto,
  ): Promise<ChronicDisease> {
    const disease = await this.getChronicDiseaseById(id);
    Object.assign(disease, dto);
    return this.chronicDiseaseRepository.save(disease);
  }

  /**
   * Retrieves selected chronic diseases associated with a Health Profile.
   *
   * @param healthProfileId - Health Profile UUID.
   * @returns Array of ChronicDisease objects.
   */
  async getProfileDiseases(healthProfileId: string): Promise<ChronicDisease[]> {
    const record = await this.profileChronicDiseaseRepository.findOne({
      where: { healthProfileId },
    });

    if (!record || !record.diseaseIds || record.diseaseIds.length === 0) {
      return [];
    }

    return this.chronicDiseaseRepository.find({
      where: { id: In(record.diseaseIds) },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Sets (upserts) the array of chronic diseases associated with a Health Profile.
   *
   * @param healthProfileId - Health Profile UUID.
   * @param diseaseIds - Array of disease UUIDs.
   * @returns Updated ProfileChronicDisease entity.
   */
  async setProfileDiseases(
    healthProfileId: string,
    diseaseIds: string[],
  ): Promise<ProfileChronicDisease> {
    // 1. Verify that all disease UUIDs exist if provided
    if (diseaseIds.length > 0) {
      const foundCount = await this.chronicDiseaseRepository.count({
        where: { id: In(diseaseIds) },
      });
      if (foundCount !== diseaseIds.length) {
        throw new NotFound('Một hoặc nhiều mã bệnh mạn tính không tồn tại trong hệ thống');
      }
    }

    // 2. Upsert record
    let record = await this.profileChronicDiseaseRepository.findOne({
      where: { healthProfileId },
    });

    if (!record) {
      record = this.profileChronicDiseaseRepository.create({
        healthProfileId,
        diseaseIds,
      });
    } else {
      record.diseaseIds = diseaseIds;
    }

    return this.profileChronicDiseaseRepository.save(record);
  }
}
