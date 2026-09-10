import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { TreatmentTargetDictionary } from './entities/treatment-target-dictionary.entity';
import { QueryTreatmentDictionaryDto } from './dtos';
import { NotFound, ErrorCode } from '@/commons/exceptions';
import { LoggerService } from '@/commons/logger/logger.service';

interface DictionarySeedItem {
  code: string;
  assessmentNotes?: string | null;
  assessmentTimeframe?: string | null;
  bpTarget?: string | null;
  lipidTarget?: string | null;
  bmiTarget?: string | null;
  glycemicTarget?: string | null;
  renalTarget?: string | null;
  dietAdvice?: string | null;
  exerciseAdvice?: string | null;
  smokingAdvice?: string | null;
  notes?: string | null;
}

@Injectable()
export class TreatmentDictionariesService implements OnModuleInit {
  private readonly logger = new LoggerService(TreatmentDictionariesService.name);

  constructor(
    @InjectRepository(TreatmentTargetDictionary)
    private readonly dictionaryRepo: Repository<TreatmentTargetDictionary>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedInitialDictionaries();
  }

  /**
   * Seeds treatment target dictionaries from JSON if empty.
   */
  private async seedInitialDictionaries(): Promise<void> {
    try {
      const count = await this.dictionaryRepo.count();
      if (count > 0) {
        return;
      }

      const candidatePaths = [
        path.join(process.cwd(), 'src/database/seeds/data/treatment-target-dictionary.json'),
        path.join(process.cwd(), 'dist/database/seeds/data/treatment-target-dictionary.json'),
        path.resolve(__dirname, '../../database/seeds/data/treatment-target-dictionary.json'),
      ];

      const seedFilePath = candidatePaths.find((p) => fs.existsSync(p));

      if (!seedFilePath) {
        this.logger.warn(`Seed file not found for treatment-target-dictionary, skipping seed.`);
        return;
      }

      const rawData = fs.readFileSync(seedFilePath, 'utf8');
      const seedItems = JSON.parse(rawData) as unknown as DictionarySeedItem[];

      const entities: TreatmentTargetDictionary[] = seedItems.map((item) =>
        this.dictionaryRepo.create({
          code: item.code.trim().toUpperCase(),
          assessmentNotes: item.assessmentNotes ?? null,
          assessmentTimeframe: item.assessmentTimeframe ?? null,
          bpTarget: item.bpTarget ?? null,
          lipidTarget: item.lipidTarget ?? null,
          bmiTarget: item.bmiTarget ?? null,
          glycemicTarget: item.glycemicTarget ?? null,
          renalTarget: item.renalTarget ?? null,
          dietAdvice: item.dietAdvice ?? null,
          exerciseAdvice: item.exerciseAdvice ?? null,
          smokingAdvice: item.smokingAdvice ?? item.notes ?? null,
          notes: item.notes ?? null,
        }),
      );

      await this.dictionaryRepo.save(entities);
      this.logger.log(`Seeded ${entities.length} treatment target dictionaries successfully.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to seed treatment target dictionaries: ${message}`);
    }
  }

  /**
   * Retrieves paginated list of treatment target dictionaries.
   *
   * @param query - QueryTreatmentDictionaryDto
   * @returns List of dictionaries and total count
   */
  async findAll(
    query: QueryTreatmentDictionaryDto,
  ): Promise<{ data: TreatmentTargetDictionary[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.dictionaryRepo.createQueryBuilder('dict');

    if (query.search) {
      const kw = `%${query.search.trim()}%`;
      qb.where(
        '(dict.code ILIKE :kw OR dict.assessmentNotes ILIKE :kw OR dict.bpTarget ILIKE :kw OR dict.notes ILIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('dict.code', 'ASC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Finds a dictionary target by its code (e.g., A1, B2).
   *
   * @param code - Dictionary code
   * @returns TreatmentTargetDictionary
   */
  async findOne(code: string): Promise<TreatmentTargetDictionary> {
    const item = await this.dictionaryRepo.findOne({
      where: { code: code.trim().toUpperCase() },
    });

    if (!item) {
      throw new NotFound(ErrorCode.TREATMENT_DICTIONARY_NOT_FOUND);
    }

    return item;
  }
}
