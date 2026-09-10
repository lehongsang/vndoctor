import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreatmentPlan } from './entities/treatment-plan.entity';
import { TreatmentTemplate } from './entities/treatment-template.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { PatientTreatmentTarget } from '@/modules/treatment-targets/entities/patient-treatment-target.entity';
import {
  CreateTreatmentPlanDto,
  CreateTreatmentTemplateDto,
  QueryTreatmentPlanDto,
  QueryTreatmentTemplateDto,
  UpdateTreatmentPlanDto,
  UpdateTreatmentTemplateDto,
} from './dtos';
import { Forbidden, NotFound, ErrorCode } from '@/commons/exceptions';
import { VnDoctorPlanStatus } from '@/commons/enums/vndoctor.enum';

@Injectable()
export class TreatmentPlansService {
  constructor(
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(TreatmentTemplate)
    private readonly templateRepo: Repository<TreatmentTemplate>,
    @InjectRepository(HealthProfile)
    private readonly healthProfileRepo: Repository<HealthProfile>,
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
    @InjectRepository(PatientTreatmentTarget)
    private readonly targetRepo: Repository<PatientTreatmentTarget>,
  ) {}

  /**
   * Helper to generate unique treatment plan code in format: TP-YYYY-XXXXX
   */
  public async generatePlanCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.planRepo.count();
    const sequence = String(count + 1).padStart(5, '0');
    return `TP-${year}-${sequence}`;
  }

  // ==========================================
  // TREATMENT TEMPLATES (MẪU PHÁC ĐỒ)
  // ==========================================

  /**
   * Create a new clinical treatment template.
   */
  async createTemplate(
    dto: CreateTreatmentTemplateDto,
    fallbackFacilityId?: string,
  ): Promise<TreatmentTemplate> {
    const facilityId = dto.facilityId || fallbackFacilityId;
    if (!facilityId) {
      throw new NotFound(ErrorCode.FACILITY_NOT_FOUND);
    }

    const facility = await this.facilityRepo.findOne({ where: { id: facilityId } });
    if (!facility) {
      throw new NotFound(ErrorCode.FACILITY_NOT_FOUND);
    }

    const template = this.templateRepo.create({
      facilityId,
      templateName: dto.templateName,
      diseaseCategory: dto.diseaseCategory ?? null,
      content: dto.content,
      isActive: dto.isActive ?? true,
    });

    return this.templateRepo.save(template);
  }

  /**
   * Update a clinical treatment template.
   */
  async updateTemplate(
    id: string,
    dto: UpdateTreatmentTemplateDto,
  ): Promise<TreatmentTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFound(ErrorCode.TREATMENT_PLAN_NOT_FOUND);
    }

    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  /**
   * Query treatment templates with filtering and pagination.
   */
  async findTemplates(
    query: QueryTreatmentTemplateDto,
  ): Promise<{ data: TreatmentTemplate[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.templateRepo
      .createQueryBuilder('tmpl')
      .leftJoinAndSelect('tmpl.facility', 'facility');

    if (query.facilityId) {
      qb.andWhere('tmpl.facilityId = :facilityId', { facilityId: query.facilityId });
    }

    if (query.diseaseCategory) {
      qb.andWhere('tmpl.diseaseCategory ILIKE :diseaseCategory', {
        diseaseCategory: `%${query.diseaseCategory}%`,
      });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('tmpl.isActive = :isActive', { isActive: query.isActive });
    }

    qb.orderBy('tmpl.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Find a treatment template by ID.
   */
  async findTemplateById(id: string): Promise<TreatmentTemplate> {
    const template = await this.templateRepo.findOne({
      where: { id },
      relations: ['facility'],
    });

    if (!template) {
      throw new NotFound(ErrorCode.TREATMENT_PLAN_NOT_FOUND);
    }

    return template;
  }

  // ==========================================
  // PATIENT TREATMENT PLANS (PHÁC ĐỒ BỆNH NHÂN)
  // ==========================================

  /**
   * Doctor creates a personalized treatment plan for a patient.
   */
  async createPlan(
    dto: CreateTreatmentPlanDto,
    doctorId: string,
  ): Promise<TreatmentPlan> {
    const profile = await this.healthProfileRepo.findOne({
      where: { id: dto.healthProfileId },
    });

    if (!profile) {
      throw new NotFound(ErrorCode.HEALTH_PROFILE_NOT_FOUND);
    }

    if (dto.treatmentTargetId) {
      const target = await this.targetRepo.findOne({
        where: { id: dto.treatmentTargetId },
      });
      if (!target) {
        throw new NotFound(ErrorCode.TREATMENT_TARGET_NOT_FOUND);
      }
    }

    const planCode = await this.generatePlanCode();
    const todayStr = new Date().toISOString().split('T')[0];

    const plan = this.planRepo.create({
      planCode,
      healthProfileId: dto.healthProfileId,
      doctorId,
      treatmentTargetId: dto.treatmentTargetId ?? null,
      title: dto.title,
      startDate: dto.startDate || todayStr,
      endDate: dto.endDate ?? null,
      doctorNotes: dto.doctorNotes ?? null,
      status: dto.status ?? VnDoctorPlanStatus.ACTIVE,
    });

    return this.planRepo.save(plan);
  }

  /**
   * Update a treatment plan.
   */
  async updatePlan(
    id: string,
    dto: UpdateTreatmentPlanDto,
    doctorId?: string,
    accountId?: string,
  ): Promise<TreatmentPlan> {
    const plan = await this.planRepo.findOne({
      where: { id },
      relations: ['healthProfile'],
    });

    if (!plan) {
      throw new NotFound(ErrorCode.TREATMENT_PLAN_NOT_FOUND);
    }

    if (accountId && plan.healthProfile && plan.healthProfile.accountId !== accountId) {
      throw new Forbidden(ErrorCode.HEALTH_PROFILE_ACCESS_DENIED);
    }

    if (doctorId) {
      plan.doctorId = doctorId;
    }

    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  /**
   * Query treatment plans with filtering and pagination.
   */
  async findPlans(
    query: QueryTreatmentPlanDto,
    accountId?: string,
  ): Promise<{ data: TreatmentPlan[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.planRepo
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.healthProfile', 'profile')
      .leftJoinAndSelect('plan.doctor', 'doctor')
      .leftJoinAndSelect('plan.treatmentTarget', 'target');

    if (accountId) {
      qb.andWhere('profile.accountId = :accountId', { accountId });
    }

    if (query.healthProfileId) {
      qb.andWhere('plan.healthProfileId = :healthProfileId', { healthProfileId: query.healthProfileId });
    }

    if (query.doctorId) {
      qb.andWhere('plan.doctorId = :doctorId', { doctorId: query.doctorId });
    }

    if (query.status) {
      qb.andWhere('plan.status = :status', { status: query.status });
    }

    qb.orderBy('plan.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Find a single treatment plan by ID.
   */
  async findPlanById(id: string, accountId?: string): Promise<TreatmentPlan> {
    const plan = await this.planRepo.findOne({
      where: { id },
      relations: ['healthProfile', 'doctor', 'treatmentTarget'],
    });

    if (!plan) {
      throw new NotFound(ErrorCode.TREATMENT_PLAN_NOT_FOUND);
    }

    if (accountId && plan.healthProfile && plan.healthProfile.accountId !== accountId) {
      throw new Forbidden(ErrorCode.HEALTH_PROFILE_ACCESS_DENIED);
    }

    return plan;
  }
}
