import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientTreatmentTarget } from './entities/patient-treatment-target.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { TreatmentTargetDictionary } from '@/modules/treatment-dictionaries/entities/treatment-target-dictionary.entity';
import {
  CreatePatientTargetDto,
  QueryPatientTargetDto,
  UpdatePatientTargetDto,
  VerifyPatientTargetDto,
} from './dtos';
import { Forbidden, NotFound } from '@/commons/exceptions';
import { PatientTargetStatus } from '@/commons/enums/vndoctor.enum';

@Injectable()
export class TreatmentTargetsService {
  constructor(
    @InjectRepository(PatientTreatmentTarget)
    private readonly targetRepo: Repository<PatientTreatmentTarget>,
    @InjectRepository(HealthProfile)
    private readonly healthProfileRepo: Repository<HealthProfile>,
    @InjectRepository(TreatmentTargetDictionary)
    private readonly dictionaryRepo: Repository<TreatmentTargetDictionary>,
  ) {}

  /**
   * Create a personalized treatment target for a patient.
   *
   * @param dto - CreatePatientTargetDto
   * @param doctorId - Optional Doctor ID if created by Doctor
   * @param accountId - Optional App Account ID if created by patient
   * @returns Created PatientTreatmentTarget
   */
  async create(
    dto: CreatePatientTargetDto,
    doctorId?: string,
    accountId?: string,
  ): Promise<PatientTreatmentTarget> {
    const profile = await this.healthProfileRepo.findOne({
      where: { id: dto.healthProfileId },
    });

    if (!profile) {
      throw new NotFound(`Hồ sơ sức khỏe ${dto.healthProfileId} không tồn tại`);
    }

    if (accountId && profile.accountId !== accountId) {
      throw new Forbidden('Bạn không có quyền tạo mục tiêu điều trị cho hồ sơ sức khỏe này');
    }

    let defaultBpTarget = dto.bpTarget;
    let defaultLipidTarget = dto.lipidTarget;
    let defaultBmiTarget = dto.bmiTarget;
    let defaultGlycemicTarget = dto.glycemicTarget;
    let defaultDietAdvice = dto.dietAdvice;
    let defaultExerciseAdvice = dto.exerciseAdvice;

    // If dictionary code is referenced, populate defaults from dictionary if not explicitly provided
    if (dto.dictionaryCode) {
      const dict = await this.dictionaryRepo.findOne({
        where: { code: dto.dictionaryCode.trim().toUpperCase() },
      });
      if (dict) {
        defaultBpTarget = defaultBpTarget ?? dict.bpTarget ?? undefined;
        defaultLipidTarget = defaultLipidTarget ?? dict.lipidTarget ?? undefined;
        defaultBmiTarget = defaultBmiTarget ?? dict.bmiTarget ?? undefined;
        defaultGlycemicTarget = defaultGlycemicTarget ?? dict.glycemicTarget ?? undefined;
        defaultDietAdvice = defaultDietAdvice ?? dict.dietAdvice ?? undefined;
        defaultExerciseAdvice = defaultExerciseAdvice ?? dict.exerciseAdvice ?? undefined;
      }
    }

    const target = this.targetRepo.create({
      healthProfileId: dto.healthProfileId,
      doctorId: doctorId ?? null,
      examinationId: dto.examinationId ?? null,
      assessmentResultId: dto.assessmentResultId ?? null,
      dictionaryCode: dto.dictionaryCode ? dto.dictionaryCode.trim().toUpperCase() : null,
      bpTarget: defaultBpTarget ?? null,
      lipidTarget: defaultLipidTarget ?? null,
      bmiTarget: defaultBmiTarget ?? null,
      glycemicTarget: defaultGlycemicTarget ?? null,
      dietAdvice: defaultDietAdvice ?? null,
      exerciseAdvice: defaultExerciseAdvice ?? null,
      doctorNotes: dto.doctorNotes ?? null,
      status: dto.status ?? (doctorId ? PatientTargetStatus.DOCTOR_VERIFIED : PatientTargetStatus.DRAFT),
      verifiedAt: doctorId ? new Date() : null,
    });

    return this.targetRepo.save(target);
  }

  /**
   * Doctor verifies and adjusts a patient's treatment target.
   *
   * @param id - Target UUID
   * @param dto - VerifyPatientTargetDto
   * @param doctorId - Doctor's Staff User ID
   * @returns Verified PatientTreatmentTarget
   */
  async verify(
    id: string,
    dto: VerifyPatientTargetDto,
    doctorId: string,
  ): Promise<PatientTreatmentTarget> {
    const target = await this.targetRepo.findOne({
      where: { id },
      relations: ['healthProfile'],
    });

    if (!target) {
      throw new NotFound(`Mục tiêu điều trị với ID ${id} không tồn tại`);
    }

    target.doctorId = doctorId;
    target.status = PatientTargetStatus.DOCTOR_VERIFIED;
    target.verifiedAt = new Date();

    if (dto.bpTarget !== undefined) target.bpTarget = dto.bpTarget;
    if (dto.lipidTarget !== undefined) target.lipidTarget = dto.lipidTarget;
    if (dto.bmiTarget !== undefined) target.bmiTarget = dto.bmiTarget;
    if (dto.glycemicTarget !== undefined) target.glycemicTarget = dto.glycemicTarget;
    if (dto.dietAdvice !== undefined) target.dietAdvice = dto.dietAdvice;
    if (dto.exerciseAdvice !== undefined) target.exerciseAdvice = dto.exerciseAdvice;
    if (dto.doctorNotes !== undefined) target.doctorNotes = dto.doctorNotes;

    return this.targetRepo.save(target);
  }

  /**
   * Update an existing treatment target.
   *
   * @param id - Target UUID
   * @param dto - UpdatePatientTargetDto
   * @param doctorId - Optional Doctor ID
   * @param accountId - Optional App Account ID
   * @returns Updated PatientTreatmentTarget
   */
  async update(
    id: string,
    dto: UpdatePatientTargetDto,
    doctorId?: string,
    accountId?: string,
  ): Promise<PatientTreatmentTarget> {
    const target = await this.targetRepo.findOne({
      where: { id },
      relations: ['healthProfile'],
    });

    if (!target) {
      throw new NotFound(`Mục tiêu điều trị với ID ${id} không tồn tại`);
    }

    if (accountId && target.healthProfile && target.healthProfile.accountId !== accountId) {
      throw new Forbidden('Bạn không có quyền chỉnh sửa mục tiêu điều trị này');
    }

    if (doctorId) {
      target.doctorId = doctorId;
    }

    Object.assign(target, dto);

    return this.targetRepo.save(target);
  }

  /**
   * Retrieve list of treatment targets with filtering and pagination.
   *
   * @param query - QueryPatientTargetDto
   * @param accountId - Optional App Account ID for patient data scoping
   * @returns Paginated list of targets
   */
  async findAll(
    query: QueryPatientTargetDto,
    accountId?: string,
  ): Promise<{ data: PatientTreatmentTarget[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.targetRepo
      .createQueryBuilder('target')
      .leftJoinAndSelect('target.healthProfile', 'profile')
      .leftJoinAndSelect('target.doctor', 'doctor')
      .leftJoinAndSelect('target.examination', 'examination')
      .leftJoinAndSelect('target.assessmentResult', 'assessmentResult')
      .leftJoinAndSelect('target.dictionary', 'dictionary');

    if (accountId) {
      qb.andWhere('profile.accountId = :accountId', { accountId });
    }

    if (query.healthProfileId) {
      qb.andWhere('target.healthProfileId = :healthProfileId', { healthProfileId: query.healthProfileId });
    }

    if (query.doctorId) {
      qb.andWhere('target.doctorId = :doctorId', { doctorId: query.doctorId });
    }

    if (query.status) {
      qb.andWhere('target.status = :status', { status: query.status });
    }

    qb.orderBy('target.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Find a single treatment target by ID.
   *
   * @param id - Target UUID
   * @param accountId - Optional App Account ID
   * @returns PatientTreatmentTarget
   */
  async findOne(id: string, accountId?: string): Promise<PatientTreatmentTarget> {
    const target = await this.targetRepo.findOne({
      where: { id },
      relations: ['healthProfile', 'doctor', 'examination', 'assessmentResult', 'dictionary'],
    });

    if (!target) {
      throw new NotFound(`Mục tiêu điều trị với ID ${id} không tồn tại`);
    }

    if (accountId && target.healthProfile && target.healthProfile.accountId !== accountId) {
      throw new Forbidden('Bạn không có quyền xem mục tiêu điều trị này');
    }

    return target;
  }
}
