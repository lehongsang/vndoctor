import { Forbidden, NotFound } from '@/commons/exceptions';
import { HealthMetricType } from '@/commons/enums/vndoctor.enum';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { CreateHealthRecordDto, QueryHealthRecordDto, UpdateHealthRecordDto } from './dtos';
import { HealthRecord } from './entities/health-record.entity';

/**
 * Service handling personal health records and vitals tracking.
 */
@Injectable()
export class HealthRecordsService {
  constructor(
    @InjectRepository(HealthRecord)
    private readonly healthRecordRepo: Repository<HealthRecord>,
    @InjectRepository(HealthProfile)
    private readonly healthProfileRepo: Repository<HealthProfile>,
  ) {}

  /**
   * Validate health profile ownership or access.
   *
   * @param healthProfileId - ID of the health profile
   * @param accountId - Optional app user account ID
   * @returns HealthProfile entity
   */
  private async validateProfileAccess(healthProfileId: string, accountId?: string): Promise<HealthProfile> {
    const profile = await this.healthProfileRepo.findOne({
      where: { id: healthProfileId },
    });

    if (!profile) {
      throw new NotFound(`Hồ sơ sức khỏe ${healthProfileId} không tồn tại`);
    }

    if (accountId && profile.accountId !== accountId) {
      throw new Forbidden('Bạn không có quyền truy cập hồ sơ sức khỏe này');
    }

    return profile;
  }

  /**
   * Log a new health metric measurement.
   *
   * @param dto - CreateHealthRecordDto
   * @param accountId - Optional account ID of the authenticated user
   * @returns Saved HealthRecord
   */
  async create(dto: CreateHealthRecordDto, accountId?: string): Promise<HealthRecord> {
    await this.validateProfileAccess(dto.healthProfileId, accountId);

    const record = this.healthRecordRepo.create({
      healthProfileId: dto.healthProfileId,
      metricType: dto.metricType,
      valueNumeric: dto.valueNumeric,
      secondaryValue: dto.secondaryValue ?? null,
      unit: dto.unit,
      note: dto.note ?? null,
      measuredAt: dto.measuredAt ?? new Date(),
    });

    return this.healthRecordRepo.save(record);
  }

  /**
   * Retrieve list of health records with filtering & pagination.
   *
   * @param query - QueryHealthRecordDto
   * @param accountId - Optional account ID to restrict access
   * @returns Paginated records list with total count
   */
  async findAll(
    query: QueryHealthRecordDto,
    accountId?: string,
  ): Promise<{ data: HealthRecord[]; total: number; page: number; limit: number }> {
    if (query.healthProfileId) {
      await this.validateProfileAccess(query.healthProfileId, accountId);
    }

    const where: FindOptionsWhere<HealthRecord> = {};

    if (query.healthProfileId) {
      where.healthProfileId = query.healthProfileId;
    }
    if (query.metricType) {
      where.metricType = query.metricType;
    }
    if (query.fromDate && query.toDate) {
      where.measuredAt = Between(query.fromDate, query.toDate);
    } else if (query.fromDate) {
      where.measuredAt = MoreThanOrEqual(query.fromDate);
    } else if (query.toDate) {
      where.measuredAt = LessThanOrEqual(query.toDate);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.healthRecordRepo.findAndCount({
      where,
      order: { measuredAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /**
   * Retrieve a single health record by ID.
   *
   * @param id - Record UUID
   * @param accountId - Optional account ID to restrict access
   * @returns HealthRecord
   */
  async findOne(id: string, accountId?: string): Promise<HealthRecord> {
    const record = await this.healthRecordRepo.findOne({
      where: { id },
      relations: ['healthProfile'],
    });

    if (!record) {
      throw new NotFound(`Bản ghi chỉ số sức khỏe với id ${id} không tồn tại`);
    }

    if (accountId && record.healthProfile && record.healthProfile.accountId !== accountId) {
      throw new Forbidden('Bạn không có quyền xem bản ghi này');
    }

    return record;
  }

  /**
   * Update an existing health record.
   *
   * @param id - Record UUID
   * @param dto - UpdateHealthRecordDto
   * @param accountId - Optional account ID to restrict access
   * @returns Updated HealthRecord
   */
  async update(id: string, dto: UpdateHealthRecordDto, accountId?: string): Promise<HealthRecord> {
    const record = await this.findOne(id, accountId);

    if (dto.metricType !== undefined) record.metricType = dto.metricType;
    if (dto.valueNumeric !== undefined) record.valueNumeric = dto.valueNumeric;
    if (dto.secondaryValue !== undefined) record.secondaryValue = dto.secondaryValue;
    if (dto.unit !== undefined) record.unit = dto.unit;
    if (dto.note !== undefined) record.note = dto.note;
    if (dto.measuredAt !== undefined) record.measuredAt = dto.measuredAt;

    return this.healthRecordRepo.save(record);
  }

  /**
   * Delete a health record.
   *
   * @param id - Record UUID
   * @param accountId - Optional account ID to restrict access
   */
  async remove(id: string, accountId?: string): Promise<void> {
    const record = await this.findOne(id, accountId);
    await this.healthRecordRepo.remove(record);
  }

  /**
   * Retrieve latest metric values for all available types (or a specific type) for a health profile.
   *
   * @param healthProfileId - Health Profile UUID
   * @param metricType - Optional specific metric type to retrieve
   * @param accountId - Optional account ID to restrict access
   * @returns Map of metric types to their latest health record
   */
  async getLatestSummary(
    healthProfileId: string,
    metricType?: HealthMetricType,
    accountId?: string,
  ): Promise<Partial<Record<HealthMetricType, HealthRecord>>> {
    await this.validateProfileAccess(healthProfileId, accountId);

    const metrics = metricType ? [metricType] : Object.values(HealthMetricType);
    const summary: Partial<Record<HealthMetricType, HealthRecord>> = {};

    await Promise.all(
      metrics.map(async (metric) => {
        const latest = await this.healthRecordRepo.findOne({
          where: { healthProfileId, metricType: metric },
          order: { measuredAt: 'DESC' },
        });
        if (latest) {
          summary[metric] = latest;
        }
      }),
    );

    return summary;
  }
}
