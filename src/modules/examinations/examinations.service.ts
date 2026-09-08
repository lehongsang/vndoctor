import { Forbidden, NotFound } from '@/commons/exceptions';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateExaminationDto, QueryExaminationDto, UpdateExaminationDto } from './dtos';
import { Examination } from './entities/examination.entity';

/**
 * Service handling Medical Examinations (Phiếu khám bệnh).
 */
@Injectable()
export class ExaminationsService {
  constructor(
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
    @InjectRepository(HealthProfile)
    private readonly healthProfileRepo: Repository<HealthProfile>,
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
    @InjectRepository(StaffUser)
    private readonly staffUserRepo: Repository<StaffUser>,
  ) {}

  /**
   * Helper to generate unique examination code (e.g. EX-20260908-A1B2).
   */
  private generateExaminationCode(): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `EX-${dateStr}-${randomHex}`;
  }

  /**
   * Create a new medical examination.
   *
   * @param dto - CreateExaminationDto
   * @param doctorId - Staff User UUID of attending doctor
   * @param defaultFacilityId - Facility ID of attending doctor
   * @returns Created Examination entity
   */
  async create(
    dto: CreateExaminationDto,
    doctorId: string,
    defaultFacilityId: string,
  ): Promise<Examination> {
    const profile = await this.healthProfileRepo.findOne({
      where: { id: dto.healthProfileId },
    });

    if (!profile) {
      throw new NotFound(`Hồ sơ sức khỏe ${dto.healthProfileId} không tồn tại`);
    }

    const targetFacilityId = dto.facilityId || defaultFacilityId;
    const facility = await this.facilityRepo.findOne({
      where: { id: targetFacilityId },
    });

    if (!facility) {
      throw new NotFound(`Cơ sở y tế ${targetFacilityId} không tồn tại`);
    }

    let calculatedBmi = dto.bmi;
    if (!calculatedBmi && dto.heightCm && dto.weightKg && dto.heightCm > 0) {
      const heightM = dto.heightCm / 100;
      calculatedBmi = Number((dto.weightKg / (heightM * heightM)).toFixed(2));
    }

    let code = this.generateExaminationCode();
    let exists = await this.examRepo.findOne({ where: { examinationCode: code } });
    while (exists) {
      code = this.generateExaminationCode();
      exists = await this.examRepo.findOne({ where: { examinationCode: code } });
    }

    const exam = this.examRepo.create({
      examinationCode: code,
      healthProfileId: dto.healthProfileId,
      doctorId,
      facilityId: targetFacilityId,
      assessmentInputId: dto.assessmentInputId ?? null,
      heartRate: dto.heartRate ?? null,
      systolicBp: dto.systolicBp ?? null,
      diastolicBp: dto.diastolicBp ?? null,
      temperature: dto.temperature ?? null,
      spo2: dto.spo2 ?? null,
      heightCm: dto.heightCm ?? null,
      weightKg: dto.weightKg ?? null,
      bmi: calculatedBmi ?? null,
      reasonForVisit: dto.reasonForVisit ?? null,
      clinicalSymptoms: dto.clinicalSymptoms ?? null,
      diagnosis: dto.diagnosis,
      icd10Code: dto.icd10Code ?? null,
      treatmentPlan: dto.treatmentPlan ?? null,
      nextAppointmentDate: dto.nextAppointmentDate ?? null,
      status: dto.status,
      examinationDate: new Date(),
    });

    return this.examRepo.save(exam);
  }

  /**
   * Update an existing examination record.
   *
   * @param id - Examination UUID
   * @param dto - UpdateExaminationDto
   * @returns Updated Examination entity
   */
  async update(id: string, dto: UpdateExaminationDto): Promise<Examination> {
    const exam = await this.examRepo.findOne({
      where: { id },
    });

    if (!exam) {
      throw new NotFound(`Phiếu khám bệnh ${id} không tồn tại`);
    }

    if (dto.heartRate !== undefined) exam.heartRate = dto.heartRate;
    if (dto.systolicBp !== undefined) exam.systolicBp = dto.systolicBp;
    if (dto.diastolicBp !== undefined) exam.diastolicBp = dto.diastolicBp;
    if (dto.temperature !== undefined) exam.temperature = dto.temperature;
    if (dto.spo2 !== undefined) exam.spo2 = dto.spo2;
    if (dto.heightCm !== undefined) exam.heightCm = dto.heightCm;
    if (dto.weightKg !== undefined) exam.weightKg = dto.weightKg;

    if (exam.heightCm && exam.weightKg && exam.heightCm > 0) {
      const heightM = exam.heightCm / 100;
      exam.bmi = Number((exam.weightKg / (heightM * heightM)).toFixed(2));
    }
    if (dto.bmi !== undefined) exam.bmi = dto.bmi;

    if (dto.reasonForVisit !== undefined) exam.reasonForVisit = dto.reasonForVisit;
    if (dto.clinicalSymptoms !== undefined) exam.clinicalSymptoms = dto.clinicalSymptoms;
    if (dto.diagnosis !== undefined) exam.diagnosis = dto.diagnosis;
    if (dto.icd10Code !== undefined) exam.icd10Code = dto.icd10Code;
    if (dto.treatmentPlan !== undefined) exam.treatmentPlan = dto.treatmentPlan;
    if (dto.nextAppointmentDate !== undefined) exam.nextAppointmentDate = dto.nextAppointmentDate;
    if (dto.status !== undefined) exam.status = dto.status;
    if (dto.assessmentInputId !== undefined) exam.assessmentInputId = dto.assessmentInputId;

    return this.examRepo.save(exam);
  }

  /**
   * Retrieve list of examinations with filtering & pagination.
   *
   * @param query - QueryExaminationDto
   * @param accountId - Optional account ID for patient access
   * @returns Paginated list of examinations
   */
  async findAll(
    query: QueryExaminationDto,
    accountId?: string,
  ): Promise<{ data: Examination[]; total: number; page: number; limit: number }> {
    const qb = this.examRepo
      .createQueryBuilder('exam')
      .leftJoinAndSelect('exam.healthProfile', 'profile')
      .leftJoinAndSelect('exam.doctor', 'doctor')
      .leftJoinAndSelect('exam.facility', 'facility')
      .leftJoinAndSelect('exam.assessmentInput', 'assessmentInput');

    if (accountId) {
      qb.andWhere('profile.accountId = :accountId', { accountId });
    }

    if (query.healthProfileId) {
      qb.andWhere('exam.healthProfileId = :healthProfileId', { healthProfileId: query.healthProfileId });
    }

    if (query.doctorId) {
      qb.andWhere('exam.doctorId = :doctorId', { doctorId: query.doctorId });
    }

    if (query.facilityId) {
      qb.andWhere('exam.facilityId = :facilityId', { facilityId: query.facilityId });
    }

    if (query.status) {
      qb.andWhere('exam.status = :status', { status: query.status });
    }

    if (query.icd10Code) {
      qb.andWhere('exam.icd10Code ILIKE :icd10Code', { icd10Code: `${query.icd10Code}%` });
    }

    if (query.fromDate && query.toDate) {
      qb.andWhere('exam.examinationDate BETWEEN :fromDate AND :toDate', {
        fromDate: query.fromDate,
        toDate: query.toDate,
      });
    } else if (query.fromDate) {
      qb.andWhere('exam.examinationDate >= :fromDate', { fromDate: query.fromDate });
    } else if (query.toDate) {
      qb.andWhere('exam.examinationDate <= :toDate', { toDate: query.toDate });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    qb.orderBy('exam.examinationDate', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Retrieve a single examination by ID.
   *
   * @param id - Examination UUID
   * @param accountId - Optional account ID for patient access
   * @returns Examination entity
   */
  async findOne(id: string, accountId?: string): Promise<Examination> {
    const exam = await this.examRepo.findOne({
      where: { id },
      relations: ['healthProfile', 'doctor', 'facility', 'assessmentInput'],
    });

    if (!exam) {
      throw new NotFound(`Phiếu khám bệnh ${id} không tồn tại`);
    }

    if (accountId && exam.healthProfile && exam.healthProfile.accountId !== accountId) {
      throw new Forbidden('Bạn không có quyền xem phiếu khám bệnh này');
    }

    return exam;
  }

  /**
   * Retrieve a single examination by examination code.
   *
   * @param examinationCode - Unique code
   * @param accountId - Optional account ID for patient access
   * @returns Examination entity
   */
  async findByCode(examinationCode: string, accountId?: string): Promise<Examination> {
    const exam = await this.examRepo.findOne({
      where: { examinationCode },
      relations: ['healthProfile', 'doctor', 'facility', 'assessmentInput'],
    });

    if (!exam) {
      throw new NotFound(`Phiếu khám bệnh với mã ${examinationCode} không tồn tại`);
    }

    if (accountId && exam.healthProfile && exam.healthProfile.accountId !== accountId) {
      throw new Forbidden('Bạn không có quyền xem phiếu khám bệnh này');
    }

    return exam;
  }
}
