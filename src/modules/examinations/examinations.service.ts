import { BadRequest, Forbidden, NotFound, ErrorCode } from '@/commons/exceptions';
import { ExaminationStatus } from '@/commons/enums/vndoctor.enum';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { PatientTreatmentTarget } from '@/modules/treatment-targets/entities/patient-treatment-target.entity';
import { TreatmentPlan } from '@/modules/treatment-plans/entities/treatment-plan.entity';
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
    @InjectRepository(PatientTreatmentTarget)
    private readonly treatmentTargetRepo: Repository<PatientTreatmentTarget>,
    @InjectRepository(TreatmentPlan)
    private readonly treatmentPlanRepo: Repository<TreatmentPlan>,
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
    defaultFacilityId?: string,
  ): Promise<Examination> {
    const profile = await this.healthProfileRepo.findOne({
      where: { id: dto.healthProfileId },
    });

    if (!profile) {
      throw new NotFound(
        ErrorCode.HEALTH_PROFILE_NOT_FOUND,
        `Không tìm thấy hồ sơ sức khỏe với mã ID: ${dto.healthProfileId}`,
      );
    }

    const targetFacilityId = dto.facilityId || defaultFacilityId;
    if (!targetFacilityId) {
      throw new BadRequest(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'Thiếu thông tin mã cơ sở y tế thực hiện khám bệnh',
      );
    }
    const facility = await this.facilityRepo.findOne({
      where: { id: targetFacilityId },
    });

    if (!facility) {
      throw new NotFound(
        ErrorCode.FACILITY_NOT_FOUND,
        `Không tìm thấy cơ sở y tế với mã ID: ${targetFacilityId}`,
      );
    }

    if (dto.treatmentTargetId) {
      const target = await this.treatmentTargetRepo.findOne({
        where: { id: dto.treatmentTargetId },
      });
      if (!target) {
        throw new NotFound(
          ErrorCode.TREATMENT_TARGET_NOT_FOUND,
          `Không tìm thấy mục tiêu điều trị với mã ID: ${dto.treatmentTargetId}`,
        );
      }
      if (target.healthProfileId !== dto.healthProfileId) {
        throw new BadRequest(
          ErrorCode.INVALID_INPUT,
          'Mục tiêu điều trị không thuộc về hồ sơ sức khỏe của bệnh nhân này',
        );
      }
    }

    if (dto.treatmentPlanId) {
      const plan = await this.treatmentPlanRepo.findOne({
        where: { id: dto.treatmentPlanId },
      });
      if (!plan) {
        throw new NotFound(
          ErrorCode.TREATMENT_PLAN_NOT_FOUND,
          `Không tìm thấy phác đồ điều trị với mã ID: ${dto.treatmentPlanId}`,
        );
      }
      if (plan.healthProfileId !== dto.healthProfileId) {
        throw new BadRequest(
          ErrorCode.INVALID_INPUT,
          'Phác đồ điều trị không thuộc về hồ sơ sức khỏe của bệnh nhân này',
        );
      }
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
      treatmentTargetId: dto.treatmentTargetId ?? null,
      treatmentPlanId: dto.treatmentPlanId ?? null,
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
      nextAppointmentDate: dto.nextAppointmentDate ?? null,
      status: dto.status,
      examinationDate: new Date(),
    });

    const savedExam = await this.examRepo.save(exam);

    // Đồng bộ ngược lại examinationId vào PatientTreatmentTarget nếu được liên kết
    if (dto.treatmentTargetId) {
      await this.treatmentTargetRepo.update(
        { id: dto.treatmentTargetId },
        { examinationId: savedExam.id },
      );
    }

    // Đồng bộ ngược lại examinationId vào TreatmentPlan nếu được liên kết
    if (dto.treatmentPlanId) {
      await this.treatmentPlanRepo.update(
        { id: dto.treatmentPlanId },
        { examinationId: savedExam.id },
      );
    }

    return this.findOne(savedExam.id);
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
      throw new NotFound(
        ErrorCode.EXAMINATION_NOT_FOUND,
        `Không tìm thấy kết quả khám bệnh với mã ID: ${id}`,
      );
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
    if (dto.nextAppointmentDate !== undefined) exam.nextAppointmentDate = dto.nextAppointmentDate;
    if (dto.status !== undefined) exam.status = dto.status;
    if (dto.assessmentInputId !== undefined) exam.assessmentInputId = dto.assessmentInputId;

    if (dto.treatmentTargetId !== undefined) {
      if (dto.treatmentTargetId) {
        const target = await this.treatmentTargetRepo.findOne({
          where: { id: dto.treatmentTargetId },
        });
        if (!target) {
          throw new NotFound(
            ErrorCode.TREATMENT_TARGET_NOT_FOUND,
            `Không tìm thấy mục tiêu điều trị với mã ID: ${dto.treatmentTargetId}`,
          );
        }
        if (target.healthProfileId !== exam.healthProfileId) {
          throw new BadRequest(
            ErrorCode.INVALID_INPUT,
            'Mục tiêu điều trị không thuộc về hồ sơ sức khỏe của bệnh nhân này',
          );
        }
        // Gỡ liên kết mục tiêu cũ nếu có thay đổi
        if (exam.treatmentTargetId && exam.treatmentTargetId !== dto.treatmentTargetId) {
          await this.treatmentTargetRepo.update(
            { id: exam.treatmentTargetId },
            { examinationId: null },
          );
        }
        // Gắn liên kết vào mục tiêu mới
        await this.treatmentTargetRepo.update(
          { id: dto.treatmentTargetId },
          { examinationId: exam.id },
        );
      } else {
        // Trường hợp gỡ bỏ mục tiêu điều trị khỏi phiếu khám (truyền null / rỗng)
        if (exam.treatmentTargetId) {
          await this.treatmentTargetRepo.update(
            { id: exam.treatmentTargetId },
            { examinationId: null },
          );
        }
      }
      exam.treatmentTargetId = dto.treatmentTargetId;
    }

    if (dto.treatmentPlanId !== undefined) {
      if (dto.treatmentPlanId) {
        const plan = await this.treatmentPlanRepo.findOne({
          where: { id: dto.treatmentPlanId },
        });
        if (!plan) {
          throw new NotFound(
            ErrorCode.TREATMENT_PLAN_NOT_FOUND,
            `Không tìm thấy phác đồ điều trị với mã ID: ${dto.treatmentPlanId}`,
          );
        }
        if (plan.healthProfileId !== exam.healthProfileId) {
          throw new BadRequest(
            ErrorCode.INVALID_INPUT,
            'Phác đồ điều trị không thuộc về hồ sơ sức khỏe của bệnh nhân này',
          );
        }
        // Gỡ liên kết phác đồ cũ nếu có thay đổi
        if (exam.treatmentPlanId && exam.treatmentPlanId !== dto.treatmentPlanId) {
          await this.treatmentPlanRepo.update(
            { id: exam.treatmentPlanId },
            { examinationId: null },
          );
        }
        // Gắn liên kết vào phác đồ mới
        await this.treatmentPlanRepo.update(
          { id: dto.treatmentPlanId },
          { examinationId: exam.id },
        );
      } else {
        // Trường hợp gỡ bỏ phác đồ điều trị khỏi phiếu khám
        if (exam.treatmentPlanId) {
          await this.treatmentPlanRepo.update(
            { id: exam.treatmentPlanId },
            { examinationId: null },
          );
        }
      }
      exam.treatmentPlanId = dto.treatmentPlanId;
    }

    await this.examRepo.save(exam);
    return this.findOne(exam.id);
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
      .leftJoinAndSelect('exam.assessmentInput', 'assessmentInput')
      .leftJoinAndSelect('assessmentInput.assessmentResult', 'assessmentResult')
      .leftJoinAndSelect('exam.treatmentTarget', 'treatmentTarget')
      .leftJoinAndSelect('exam.treatmentPlanEntity', 'treatmentPlanEntity');

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

    if (query.treatmentTargetId) {
      qb.andWhere('exam.treatmentTargetId = :treatmentTargetId', { treatmentTargetId: query.treatmentTargetId });
    }

    if (query.treatmentPlanId) {
      qb.andWhere('exam.treatmentPlanId = :treatmentPlanId', { treatmentPlanId: query.treatmentPlanId });
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
      relations: [
        'healthProfile',
        'doctor',
        'facility',
        'assessmentInput',
        'assessmentInput.assessmentResult',
        'treatmentTarget',
        'treatmentPlanEntity',
      ],
    });

    if (!exam) {
      throw new NotFound(
        ErrorCode.EXAMINATION_NOT_FOUND,
        `Không tìm thấy kết quả khám bệnh với mã ID: ${id}`,
      );
    }

    if (accountId && exam.healthProfile && exam.healthProfile.accountId !== accountId) {
      throw new Forbidden(
        ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
        'Bạn không có quyền truy cập kết quả khám bệnh của người khác',
      );
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
      relations: [
        'healthProfile',
        'doctor',
        'facility',
        'assessmentInput',
        'assessmentInput.assessmentResult',
        'treatmentTarget',
        'treatmentPlanEntity',
      ],
    });

    if (!exam) {
      throw new NotFound(
        ErrorCode.EXAMINATION_NOT_FOUND,
        `Không tìm thấy kết quả khám bệnh với mã số khám: ${examinationCode}`,
      );
    }

    if (accountId && exam.healthProfile && exam.healthProfile.accountId !== accountId) {
      throw new Forbidden(
        ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
        'Bạn không có quyền truy cập kết quả khám bệnh của người khác',
      );
    }

    return exam;
  }

  /**
   * Soft delete an examination record.
   *
   * @param id - Examination UUID
   * @param staffFacilityId - Optional facility ID for authorization check
   * @returns Deletion status
   */
  async remove(id: string, staffFacilityId?: string): Promise<{ success: boolean; message: string }> {
    const exam = await this.examRepo.findOne({
      where: { id },
    });

    if (!exam) {
      throw new NotFound(
        ErrorCode.EXAMINATION_NOT_FOUND,
        `Không tìm thấy kết quả khám bệnh với mã ID: ${id}`,
      );
    }

    if (staffFacilityId && exam.facilityId !== staffFacilityId) {
      throw new Forbidden(
        ErrorCode.FACILITY_ACCESS_DENIED,
        'Bạn không có quyền xóa kết quả khám bệnh của cơ sở y tế khác',
      );
    }

    exam.status = ExaminationStatus.CANCELLED;
    await this.examRepo.save(exam);
    await this.examRepo.softRemove(exam);

    return { success: true, message: 'Examination deleted successfully' };
  }
}
