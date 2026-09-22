import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientTreatmentTarget } from './entities/patient-treatment-target.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { TreatmentTargetDictionary } from '@/modules/treatment-dictionaries/entities/treatment-target-dictionary.entity';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';
import {
  EscalateExpertTargetDto,
  QueryPatientTargetDto,
  UpdatePatientTargetDto,
  VerifyPatientTargetDto,
} from './dtos';
import { BadRequest, Forbidden, NotFound, ErrorCode } from '@/commons/exceptions';
import { CareSubscriptionStatus, PatientTargetStatus, StaffRole, VnDoctorRiskLevel } from '@/commons/enums/vndoctor.enum';
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';

@Injectable()
export class TreatmentTargetsService {
  constructor(
    @InjectRepository(PatientTreatmentTarget)
    private readonly targetRepo: Repository<PatientTreatmentTarget>,
    @InjectRepository(HealthProfile)
    private readonly healthProfileRepo: Repository<HealthProfile>,
    @InjectRepository(TreatmentTargetDictionary)
    private readonly dictionaryRepo: Repository<TreatmentTargetDictionary>,
    @InjectRepository(PatientCareSubscription)
    private readonly careSubscriptionRepo: Repository<PatientCareSubscription>,
  ) {}

  /**
   * Helper to derive Ministry of Health Target Dictionary Code (A1 -> G5)
   * from risk level and patient age.
   *
   * @param riskLevel - VnDoctorRiskLevel (LOW, HIGH, VERY_HIGH)
   * @param age - Patient age in years
   * @returns Dictionary code string (e.g. 'A1', 'B2', 'C1')
   */
  public calculateDictionaryCode(riskLevel: VnDoctorRiskLevel, age: number): string {
    if (riskLevel === VnDoctorRiskLevel.VERY_HIGH) {
      if (age < 50) return 'C1';
      if (age < 70) return 'C2';
      return 'C3';
    }
    if (riskLevel === VnDoctorRiskLevel.HIGH) {
      if (age < 50) return 'B1';
      if (age < 70) return 'B2';
      return 'B3';
    }
    // LOW risk
    if (age < 50) return 'A1';
    if (age < 70) return 'A2';
    return 'A3';
  }

  /**
   * Auto-generate personalized Treatment Target from Ministry of Health dictionary
   * after a Risk Factor Assessment is calculated.
   *
   * Logic:
   * 1. Check if HealthProfile has an ACTIVE care subscription.
   * 2. If NO active subscription: Do NOT generate / show target for patient (exclusive feature).
   * 3. If ACTIVE subscription: Fetch dictionary A1-G5, auto-generate Target in PENDING_REVIEW status,
   *    and assign to the primary attending doctor in the package.
   *
   * @param params - Assessment results and profile metadata
   * @returns Generated PatientTreatmentTarget or null if no active subscription
   */
  async generateFromRiskAssessment(params: {
    healthProfileId: string;
    assessmentResultId: string;
    riskLevel: VnDoctorRiskLevel;
    age: number;
    examinationId?: string;
  }): Promise<PatientTreatmentTarget | null> {
    const { healthProfileId, assessmentResultId, riskLevel, age, examinationId } = params;

    // 1. Kiểm tra gói chăm sóc còn hiệu lực (ACTIVE)
    const activeSubscription = await this.careSubscriptionRepo.findOne({
      where: {
        healthProfileId,
        status: CareSubscriptionStatus.ACTIVE,
      },
      relations: ['assignedDoctor', 'assignedExpert', 'carePackage'],
    });

    if (!activeSubscription) {
      // Bệnh nhân chưa có gói dịch vụ active -> Không sinh mục tiêu điều trị tự động
      return null;
    }

    // 2. Map sang mã từ điển Bộ Y Tế (A1 -> G5)
    const dictionaryCode = this.calculateDictionaryCode(riskLevel, age);
    const dict = await this.dictionaryRepo.findOne({
      where: { code: dictionaryCode },
    });

    // 3. Khởi tạo / cập nhật bản ghi PatientTreatmentTarget
    let target = await this.targetRepo.findOne({
      where: { assessmentResultId },
    });

    if (!target) {
      target = this.targetRepo.create({
        healthProfileId,
        careSubscriptionId: activeSubscription.id,
        doctorId: activeSubscription.assignedDoctorId ?? null,
        expertId: activeSubscription.assignedExpertId ?? null,
        examinationId: examinationId ?? null,
        assessmentResultId,
        dictionaryCode,
        bpTarget: dict?.bpTarget ?? null,
        lipidTarget: dict?.lipidTarget ?? null,
        bmiTarget: dict?.bmiTarget ?? null,
        glycemicTarget: dict?.glycemicTarget ?? null,
        renalTarget: dict?.renalTarget ?? null,
        dietAdvice: dict?.dietAdvice ?? null,
        exerciseAdvice: dict?.exerciseAdvice ?? null,
        smokingAdvice: dict?.smokingAdvice ?? dict?.notes ?? null,
        doctorNotes: null,
        expertNotes: null,
        status: PatientTargetStatus.PENDING_REVIEW,
        verifiedAt: null,
      });
    } else {
      target.careSubscriptionId = activeSubscription.id;
      target.doctorId = activeSubscription.assignedDoctorId ?? target.doctorId;
      target.expertId = activeSubscription.assignedExpertId ?? target.expertId;
      target.dictionaryCode = dictionaryCode;
      target.bpTarget = dict?.bpTarget ?? target.bpTarget;
      target.lipidTarget = dict?.lipidTarget ?? target.lipidTarget;
      target.bmiTarget = dict?.bmiTarget ?? target.bmiTarget;
      target.glycemicTarget = dict?.glycemicTarget ?? target.glycemicTarget;
      target.renalTarget = dict?.renalTarget ?? target.renalTarget;
      target.dietAdvice = dict?.dietAdvice ?? target.dietAdvice;
      target.exerciseAdvice = dict?.exerciseAdvice ?? target.exerciseAdvice;
      target.smokingAdvice = dict?.smokingAdvice ?? dict?.notes ?? target.smokingAdvice;
    }

    return this.targetRepo.save(target);
  }

  /**
   * Bệnh nhân xem danh sách mục tiêu điều trị thuộc hồ sơ sức khỏe của mình.
   *
   * Business rule:
   * Chỉ trả về các mục tiêu mà hồ sơ đang có gói dịch vụ ACTIVE, HOẶC đã được bác sĩ xác nhận (DOCTOR_VERIFIED / EXPERT_VERIFIED).
   *
   * @param query - QueryPatientTargetDto
   * @param accountId - App Account UUID
   * @returns Danh sách mục tiêu điều trị
   */
  async findAllForPatient(
    query: QueryPatientTargetDto,
    accountId: string,
  ): Promise<{ data: PatientTreatmentTarget[]; total: number; page: number; limit: number }> {
    if (query.healthProfileId) {
      const profile = await this.healthProfileRepo.findOne({
        where: { id: query.healthProfileId },
      });
      if (!profile) {
        throw new NotFound(
          ErrorCode.HEALTH_PROFILE_NOT_FOUND,
          'Không tìm thấy hồ sơ sức khỏe',
        );
      }
      if (profile.accountId && profile.accountId !== accountId) {
        throw new Forbidden(
          ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
          'Bạn không có quyền xem mục tiêu điều trị của hồ sơ này',
        );
      }
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.targetRepo
      .createQueryBuilder('target')
      .innerJoin('target.healthProfile', 'profile')
      .leftJoin('target.careSubscription', 'sub')
      .where('profile.accountId = :accountId', { accountId })
      .andWhere(
        '(sub.status = :activeStatus OR target.status IN (:...verifiedStatuses))',
        {
          activeStatus: CareSubscriptionStatus.ACTIVE,
          verifiedStatuses: [
            PatientTargetStatus.DOCTOR_VERIFIED,
            PatientTargetStatus.EXPERT_VERIFIED,
            PatientTargetStatus.COMPLETED,
          ],
        },
      );

    if (query.healthProfileId) {
      qb.andWhere('target.healthProfileId = :healthProfileId', {
        healthProfileId: query.healthProfileId,
      });
    }

    if (query.status) {
      qb.andWhere('target.status = :status', { status: query.status });
    }

    qb.orderBy('target.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Bệnh nhân xem chi tiết 1 mục tiêu điều trị của mình.
   *
   * @param id - Target UUID
   * @param accountId - App Account UUID
   * @returns PatientTreatmentTarget
   */
  async findOneForPatient(id: string, accountId: string): Promise<PatientTreatmentTarget> {
    const target = await this.targetRepo
      .createQueryBuilder('target')
      .innerJoin('target.healthProfile', 'profile')
      .leftJoin('target.careSubscription', 'sub')
      .addSelect(['profile.accountId', 'sub.status'])
      .where('target.id = :id', { id })
      .getOne();

    if (!target) {
      throw new NotFound(
        ErrorCode.TREATMENT_TARGET_NOT_FOUND,
        `Không tìm thấy mục tiêu điều trị với mã ID: ${id}`,
      );
    }

    if (target.healthProfile?.accountId !== accountId) {
      throw new Forbidden(
        ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
        'Bạn không có quyền truy cập mục tiêu điều trị này',
      );
    }

    const hasActiveSub = target.careSubscription?.status === CareSubscriptionStatus.ACTIVE;
    const isVerified = [
      PatientTargetStatus.DOCTOR_VERIFIED,
      PatientTargetStatus.EXPERT_VERIFIED,
      PatientTargetStatus.COMPLETED,
    ].includes(target.status);

    if (!hasActiveSub && !isVerified) {
      throw new Forbidden(
        ErrorCode.CARE_SUBSCRIPTION_NOT_FOUND,
        'Mục tiêu điều trị này yêu cầu gói chăm sóc sức khỏe còn hiệu lực hoặc đã được bác sĩ phê duyệt',
      );
    }

    delete target.healthProfile;
    delete target.careSubscription;
    return target;
  }

  /**
   * Lấy mục tiêu điều trị theo ID phân tầng nguy cơ (assessmentResultId hoặc assessmentInputId).
   * Hỗ trợ cho cả Bệnh nhân (chỉ xem nếu sở hữu hồ sơ và có gói active/đã duyệt) và Bác sĩ/Nhân viên y tế.
   *
   * @param assessmentId - UUID của RiskFactorAssessmentResult hoặc RiskFactorAssessmentInput
   * @param accountId - Optional App Account UUID (nếu là bệnh nhân)
   * @returns PatientTreatmentTarget
   */
  async findByAssessmentId(
    assessmentId: string,
    accountId?: string,
  ): Promise<PatientTreatmentTarget> {
    const target = await this.targetRepo
      .createQueryBuilder('target')
      .innerJoin('target.healthProfile', 'profile')
      .leftJoin('target.careSubscription', 'sub')
      .leftJoin('target.assessmentResult', 'assessmentResult')
      .addSelect(['profile.accountId', 'sub.status', 'assessmentResult.assessmentInputId'])
      .where(
        'target.assessmentResultId = :assessmentId OR assessmentResult.assessmentInputId = :assessmentId OR target.id = :assessmentId',
        { assessmentId },
      )
      .getOne();

    if (!target) {
      throw new NotFound(
        ErrorCode.TREATMENT_TARGET_NOT_FOUND,
        'Không tìm thấy mục tiêu điều trị liên kết với kết quả phân tầng này',
      );
    }

    // Nếu người gọi là Bệnh nhân (App Account) -> kiểm tra quyền sở hữu và điều kiện gói dịch vụ
    if (accountId) {
      if (target.healthProfile?.accountId !== accountId) {
        throw new Forbidden(
          ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
          'Bạn không có quyền truy cập mục tiêu điều trị này',
        );
      }

      const hasActiveSub = target.careSubscription?.status === CareSubscriptionStatus.ACTIVE;
      const isVerified = [
        PatientTargetStatus.DOCTOR_VERIFIED,
        PatientTargetStatus.EXPERT_VERIFIED,
        PatientTargetStatus.COMPLETED,
      ].includes(target.status);

      if (!hasActiveSub && !isVerified) {
        throw new Forbidden(
          ErrorCode.CARE_SUBSCRIPTION_NOT_FOUND,
          'Mục tiêu điều trị chỉ hiển thị khi có gói dịch vụ chăm sóc đang kích hoạt hoặc đã được bác sĩ thẩm định',
        );
      }
    }

    delete target.healthProfile;
    delete target.careSubscription;
    delete target.assessmentResult;
    return target;
  }

  /**
   * Bác sĩ & Nhân viên y tế CMS xem danh sách mục tiêu điều trị.
   *
   * @param query - QueryPatientTargetDto
   * @param staff - Authenticated Staff context
   * @returns Danh sách mục tiêu điều trị phân trang
   */
  async findAllForStaff(
    query: QueryPatientTargetDto,
    staff?: StaffJwtPayload,
  ): Promise<{ data: PatientTreatmentTarget[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.targetRepo.createQueryBuilder('target');

    // Nếu bác sĩ gọi và không truyền lọc riêng, mặc định lấy các target được gán cho chính bác sĩ hoặc chuyên gia
    if (staff && staff.role === StaffRole.DOCTOR && !query.doctorId && !query.expertId) {
      qb.andWhere('(target.doctorId = :staffId OR target.expertId = :staffId)', { staffId: staff.id });
    }

    if (query.healthProfileId) {
      qb.andWhere('target.healthProfileId = :healthProfileId', {
        healthProfileId: query.healthProfileId,
      });
    }

    if (query.careSubscriptionId) {
      qb.andWhere('target.careSubscriptionId = :careSubscriptionId', {
        careSubscriptionId: query.careSubscriptionId,
      });
    }

    if (query.doctorId) {
      qb.andWhere('target.doctorId = :doctorId', { doctorId: query.doctorId });
    }

    if (query.expertId) {
      qb.andWhere('target.expertId = :expertId', { expertId: query.expertId });
    }

    if (query.status) {
      qb.andWhere('target.status = :status', { status: query.status });
    }

    qb.orderBy('target.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Bác sĩ / Staff xem chi tiết mục tiêu điều trị trên CMS.
   *
   * @param id - Target UUID
   * @returns PatientTreatmentTarget
   */
  async findOneForStaff(id: string): Promise<PatientTreatmentTarget> {
    const target = await this.targetRepo.findOne({
      where: { id },
    });

    if (!target) {
      throw new NotFound(
        ErrorCode.TREATMENT_TARGET_NOT_FOUND,
        `Không tìm thấy mục tiêu điều trị với mã ID: ${id}`,
      );
    }

    return target;
  }

  /**
   * Bác sĩ phụ trách hoặc Bác sĩ chuyên gia cập nhật, tinh chỉnh các chỉ số mục tiêu.
   *
   * @param id - Target UUID
   * @param dto - UpdatePatientTargetDto
   * @param staff - Staff context
   * @returns Updated PatientTreatmentTarget
   */
  async update(
    id: string,
    dto: UpdatePatientTargetDto,
    staff: StaffJwtPayload,
  ): Promise<PatientTreatmentTarget> {
    const target = await this.findOneForStaff(id);

    if (dto.bpTarget !== undefined) target.bpTarget = dto.bpTarget;
    if (dto.lipidTarget !== undefined) target.lipidTarget = dto.lipidTarget;
    if (dto.bmiTarget !== undefined) target.bmiTarget = dto.bmiTarget;
    if (dto.glycemicTarget !== undefined) target.glycemicTarget = dto.glycemicTarget;
    if (dto.renalTarget !== undefined) target.renalTarget = dto.renalTarget;
    if (dto.dietAdvice !== undefined) target.dietAdvice = dto.dietAdvice;
    if (dto.exerciseAdvice !== undefined) target.exerciseAdvice = dto.exerciseAdvice;
    if (dto.smokingAdvice !== undefined) target.smokingAdvice = dto.smokingAdvice;
    if (dto.doctorNotes !== undefined) target.doctorNotes = dto.doctorNotes;
    if (dto.expertNotes !== undefined) target.expertNotes = dto.expertNotes;

    // Ghi nhận bác sĩ thao tác gần nhất nếu chưa có
    if (!target.doctorId && staff.role === StaffRole.DOCTOR) {
      target.doctorId = staff.id;
    }

    return this.targetRepo.save(target);
  }

  /**
   * Bác sĩ hoặc Bác sĩ Chuyên gia xác nhận phê duyệt mục tiêu điều trị.
   *
   * @param id - Target UUID
   * @param dto - VerifyPatientTargetDto
   * @param staff - Staff context
   * @returns Verified PatientTreatmentTarget
   */
  async verify(
    id: string,
    dto: VerifyPatientTargetDto,
    staff: StaffJwtPayload,
  ): Promise<PatientTreatmentTarget> {
    const target = await this.findOneForStaff(id);

    // Nếu target đang ở trạng thái chuyển tiếp chuyên gia hoặc người duyệt là chuyên gia
    if (
      target.status === PatientTargetStatus.ESCALATED_TO_EXPERT ||
      (target.expertId && target.expertId === staff.id)
    ) {
      target.expertId = staff.id;
      target.status = PatientTargetStatus.EXPERT_VERIFIED;
    } else {
      target.doctorId = staff.id;
      target.status = PatientTargetStatus.DOCTOR_VERIFIED;
    }

    target.verifiedAt = new Date();

    if (dto.bpTarget !== undefined) target.bpTarget = dto.bpTarget;
    if (dto.lipidTarget !== undefined) target.lipidTarget = dto.lipidTarget;
    if (dto.bmiTarget !== undefined) target.bmiTarget = dto.bmiTarget;
    if (dto.glycemicTarget !== undefined) target.glycemicTarget = dto.glycemicTarget;
    if (dto.renalTarget !== undefined) target.renalTarget = dto.renalTarget;
    if (dto.dietAdvice !== undefined) target.dietAdvice = dto.dietAdvice;
    if (dto.exerciseAdvice !== undefined) target.exerciseAdvice = dto.exerciseAdvice;
    if (dto.smokingAdvice !== undefined) target.smokingAdvice = dto.smokingAdvice;
    if (dto.doctorNotes !== undefined) target.doctorNotes = dto.doctorNotes;
    if (dto.expertNotes !== undefined) target.expertNotes = dto.expertNotes;

    return this.targetRepo.save(target);
  }

  /**
   * Bác sĩ phụ trách chuyển tiếp mục tiêu điều trị sang Bác sĩ Chuyên gia trong gói VIP.
   *
   * @param id - Target UUID
   * @param dto - EscalateExpertTargetDto
   * @param staff - Staff context
   * @returns Escalated PatientTreatmentTarget
   */
  async escalateToExpert(
    id: string,
    dto: EscalateExpertTargetDto,
    staff: StaffJwtPayload,
  ): Promise<PatientTreatmentTarget> {
    const target = await this.findOneForStaff(id);

    const targetExpertId = dto.expertId || target.expertId || target.careSubscription?.assignedExpertId;

    if (!targetExpertId) {
      throw new BadRequest(
        ErrorCode.INVALID_INPUT,
        'Hồ sơ hoặc gói chăm sóc này chưa được chỉ định Bác sĩ Chuyên gia để chuyển tiếp',
      );
    }

    target.doctorId = staff.id;
    target.expertId = targetExpertId;
    target.status = PatientTargetStatus.ESCALATED_TO_EXPERT;

    if (dto.doctorNotes) {
      target.doctorNotes = dto.doctorNotes;
    }

    return this.targetRepo.save(target);
  }

  /**
   * Xóa mềm mục tiêu điều trị.
   *
   * @param id - Target UUID
   * @returns Success response
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const target = await this.findOneForStaff(id);
    await this.targetRepo.softRemove(target);
    return { success: true, message: 'Treatment target deleted successfully' };
  }
}

