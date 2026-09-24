import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { ChronicDisease } from './entities/chronic-disease.entity';
import {
  ChronicDiseaseResponseDto,
  CreateChronicDiseaseDto,
  QueryChronicDiseaseDto,
  UpdateChronicDiseaseDto,
} from './dtos';
import { Conflict, NotFound, ErrorCode } from '@/commons/exceptions';
import { LoggerService } from '@/commons/logger/logger.service';

interface IcdSeedItem {
  section?: string;
  score2Code?: string;
  name: string;
  directIcd10Code?: string;
  directIcd10Name?: string;
  relatedIcd10Codes?: string[];
}

/**
 * Hàm helper chuẩn hóa dữ liệu bệnh mạn tính trả về chỉ gồm 4 trường: id, code, name, icd10Code.
 */
function mapToResponseDto(disease: ChronicDisease): ChronicDiseaseResponseDto {
  return {
    id: disease.id,
    code: disease.code,
    name: disease.name,
    icd10Code: disease.icd10Code || null,
  };
}

@Injectable()
export class ChronicDiseasesService implements OnModuleInit {
  private readonly logger = new LoggerService(ChronicDiseasesService.name);

  constructor(
    @InjectRepository(ChronicDisease)
    private readonly chronicDiseaseRepository: Repository<ChronicDisease>,
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

      const candidatePaths = [
        path.join(process.cwd(), 'src/database/seeds/data/icd10-score2-dictionary.json'),
        path.join(process.cwd(), 'dist/database/seeds/data/icd10-score2-dictionary.json'),
        path.resolve(__dirname, '../../database/seeds/data/icd10-score2-dictionary.json'),
      ];

      const seedFilePath = candidatePaths.find((p) => fs.existsSync(p));

      if (!seedFilePath) {
        this.logger.warn(`Seed file not found for chronic diseases, skipping seed.`);
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
   * Lấy danh sách bệnh mạn tính phân trang (chỉ trả về id, code, name, icd10Code).
   *
   * @param query - Search and filter parameters.
   * @returns Paginated items and total count.
   */
  async getChronicDiseases(
    query: QueryChronicDiseaseDto,
  ): Promise<{ items: ChronicDiseaseResponseDto[]; total: number; page: number; limit: number }> {
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
    return {
      items: items.map(mapToResponseDto),
      total,
      page,
      limit,
    };
  }

  /**
   * Lấy chi tiết một bệnh mạn tính theo ID (chỉ trả về id, code, name, icd10Code).
   *
   * @param id - Disease UUID.
   * @returns Chronic disease response DTO.
   */
  async getChronicDiseaseById(id: string): Promise<ChronicDiseaseResponseDto> {
    const disease = await this.chronicDiseaseRepository.findOne({ where: { id } });
    if (!disease) {
      throw new NotFound(
        ErrorCode.CHRONIC_DISEASE_NOT_FOUND,
        `Không tìm thấy bệnh mãn tính với mã ID: ${id}`,
      );
    }
    return mapToResponseDto(disease);
  }

  /**
   * Thêm mới một bệnh mạn tính vào danh mục chuẩn (chỉ trả về id, code, name, icd10Code).
   *
   * @param dto - Disease data.
   * @returns Newly created disease response DTO.
   */
  async createChronicDisease(dto: CreateChronicDiseaseDto): Promise<ChronicDiseaseResponseDto> {
    const existing = await this.chronicDiseaseRepository.findOne({
      where: { code: dto.code.trim().toUpperCase() },
    });

    if (existing) {
      throw new Conflict(
        ErrorCode.CHRONIC_DISEASE_CODE_ALREADY_EXISTS,
        `Mã bệnh mãn tính "${dto.code}" đã tồn tại trong danh mục`,
      );
    }

    const disease = this.chronicDiseaseRepository.create({
      ...dto,
      code: dto.code.trim().toUpperCase(),
    });

    const saved = await this.chronicDiseaseRepository.save(disease);
    return mapToResponseDto(saved);
  }

  /**
   * Cập nhật thông tin bệnh mạn tính trong danh mục (chỉ trả về id, code, name, icd10Code).
   *
   * @param id - Disease UUID.
   * @param dto - Update payload.
   * @returns Updated disease response DTO.
   */
  async updateChronicDisease(
    id: string,
    dto: UpdateChronicDiseaseDto,
  ): Promise<ChronicDiseaseResponseDto> {
    const disease = await this.chronicDiseaseRepository.findOne({ where: { id } });
    if (!disease) {
      throw new NotFound(
        ErrorCode.CHRONIC_DISEASE_NOT_FOUND,
        `Không tìm thấy bệnh mãn tính với mã ID: ${id}`,
      );
    }
    Object.assign(disease, dto);
    const saved = await this.chronicDiseaseRepository.save(disease);
    return mapToResponseDto(saved);
  }

  /**
   * Xóa mềm bệnh mạn tính khỏi danh mục.
   *
   * @param id - Disease UUID.
   * @returns Soft deletion result.
   */
  async deleteChronicDisease(id: string): Promise<{ success: boolean; message: string }> {
    const disease = await this.chronicDiseaseRepository.findOne({ where: { id } });
    if (!disease) {
      throw new NotFound(
        ErrorCode.CHRONIC_DISEASE_NOT_FOUND,
        `Không tìm thấy bệnh mãn tính với mã ID: ${id}`,
      );
    }
    disease.isActive = false;
    await this.chronicDiseaseRepository.save(disease);
    await this.chronicDiseaseRepository.softRemove(disease);
    return { success: true, message: 'Chronic disease deleted successfully' };
  }
}
