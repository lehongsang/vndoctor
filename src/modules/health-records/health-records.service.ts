import { Forbidden, NotFound, ErrorCode } from '@/commons/exceptions';
import { HealthMetricType } from '@/commons/enums/vndoctor.enum';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { CreateHealthRecordDto, QueryHealthRecordDto, UpdateHealthRecordDto } from './dtos';
import { HealthRecord } from './entities/health-record.entity';
import { classifyBloodPressure } from './helpers/blood-pressure-classifier.helper';

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
   * Enriches a health record with VNHA clinical classification if applicable.
   *
   * @param record - HealthRecord entity
   * @returns HealthRecord with evaluation
   */
  private enrichRecord(record: HealthRecord): HealthRecord {
    if (
      record.metricType === HealthMetricType.BLOOD_PRESSURE &&
      record.valueNumeric !== null &&
      record.valueNumeric !== undefined &&
      record.secondaryValue !== null &&
      record.secondaryValue !== undefined
    ) {
      record.evaluation = classifyBloodPressure(
        Number(record.valueNumeric),
        Number(record.secondaryValue),
      );
    } else {
      record.evaluation = null;
    }
    return record;
  }

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
      throw new NotFound(
        ErrorCode.HEALTH_PROFILE_NOT_FOUND,
        `Không tìm thấy hồ sơ sức khỏe với mã ID: ${healthProfileId}`,
      );
    }

    if (accountId && profile.accountId !== accountId) {
      throw new Forbidden(
        ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
        'Bạn không có quyền truy cập hoặc ghi dữ liệu chỉ số sức khỏe của người khác',
      );
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

    const saved = await this.healthRecordRepo.save(record);
    return this.enrichRecord(saved);
  }

  /**
   * Retrieve list of health records with filtering & pagination.
   *
   * @param query - QueryHealthRecordDto
   * @param accountId - Optional account ID to restrict access to own profiles
   * @returns Paginated list of HealthRecord entities
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

    return {
      data: data.map((r) => this.enrichRecord(r)),
      total,
      page,
      limit,
    };
  }

  /**
   * Retrieve a single health record by ID.
   *
   * @param id - Record UUID
   * @param accountId - Optional account ID to restrict access
   * @returns HealthRecord entity
   */
  async findOne(id: string, accountId?: string): Promise<HealthRecord> {
    const record = await this.healthRecordRepo.findOne({
      where: { id },
      relations: ['healthProfile'],
    });

    if (!record) {
      throw new NotFound(
        ErrorCode.HEALTH_RECORD_NOT_FOUND,
        `Không tìm thấy bản ghi chỉ số sức khỏe với mã ID: ${id}`,
      );
    }

    if (accountId && record.healthProfile && record.healthProfile.accountId !== accountId) {
      throw new Forbidden(
        ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
        'Bạn không có quyền truy cập chỉ số sức khỏe của người khác',
      );
    }

    return this.enrichRecord(record);
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

    const updated = await this.healthRecordRepo.save(record);
    return this.enrichRecord(updated);
  }

  /**
   * Soft delete a health record.
   *
   * @param id - Record UUID
   * @param accountId - Optional account ID to restrict access
   */
  async remove(id: string, accountId?: string): Promise<void> {
    const record = await this.findOne(id, accountId);
    await this.healthRecordRepo.softRemove(record);
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

    for (const type of metrics) {
      const latest = await this.healthRecordRepo.findOne({
        where: { healthProfileId, metricType: type },
        order: { measuredAt: 'DESC' },
      });

      if (latest) {
        summary[type] = this.enrichRecord(latest);
      }
    }

    return summary;
  }
}
