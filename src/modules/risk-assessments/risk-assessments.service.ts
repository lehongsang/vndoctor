import { AssessmentStatus, VnDoctorRiskLevel } from '@/commons/enums/vndoctor.enum';
import { Forbidden, NotFound } from '@/commons/exceptions';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRiskAssessmentDto, EvaluateRiskAssessmentDto, QueryRiskAssessmentDto } from './dtos';
import { RiskFactorAssessmentInput } from './entities/risk-factor-assessment-input.entity';
import { RiskFactorAssessmentResult } from './entities/risk-factor-assessment-result.entity';

export interface RedFlagItem {
  metric: string;
  level: 'WARNING' | 'DANGER';
  title: string;
  value: string;
}

export type RiskAssessmentResultWithRedFlags = RiskFactorAssessmentResult & {
  hasWarningAlert?: boolean;
  redFlags?: RedFlagItem[];
};

/**
 * Service handling Cardiovascular & Metabolic Risk Factor Assessments (PTYTNC / SCORE2).
 */
@Injectable()
export class RiskAssessmentsService {
  constructor(
    @InjectRepository(RiskFactorAssessmentInput)
    private readonly inputRepo: Repository<RiskFactorAssessmentInput>,
    @InjectRepository(RiskFactorAssessmentResult)
    private readonly resultRepo: Repository<RiskFactorAssessmentResult>,
    @InjectRepository(HealthProfile)
    private readonly healthProfileRepo: Repository<HealthProfile>,
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
  ) {}

  /**
   * Helper to evaluate red flag warning metrics from clinical inputs.
   *
   * @param input - RiskFactorAssessmentInput
   * @returns { hasWarningAlert: boolean; redFlags: RedFlagItem[] }
   */
  public calculateRedFlags(input: Partial<RiskFactorAssessmentInput>): {
    hasWarningAlert: boolean;
    redFlags: RedFlagItem[];
  } {
    const redFlags: RedFlagItem[] = [];

    // 1. Huyết áp
    if (input.systolicBp !== undefined && input.systolicBp !== null) {
      if (input.systolicBp >= 160 || (input.diastolicBp && input.diastolicBp >= 100)) {
        redFlags.push({
          metric: 'BLOOD_PRESSURE',
          level: 'DANGER',
          title: 'Huyết áp tăng cao (Tăng huyết áp độ 2/3)',
          value: `${input.systolicBp}/${input.diastolicBp ?? '--'} mmHg`,
        });
      } else if (input.systolicBp >= 140 || (input.diastolicBp && input.diastolicBp >= 90)) {
        redFlags.push({
          metric: 'BLOOD_PRESSURE',
          level: 'WARNING',
          title: 'Huyết áp vượt ngưỡng an toàn (Tăng huyết áp độ 1)',
          value: `${input.systolicBp}/${input.diastolicBp ?? '--'} mmHg`,
        });
      }
    }

    // 2. Hút thuốc lá
    if (input.isSmoking) {
      redFlags.push({
        metric: 'SMOKING',
        level: 'DANGER',
        title: 'Hút thuốc lá làm tăng gấp đôi nguy cơ biến cố tim mạch',
        value: 'Đang hút thuốc',
      });
    }

    // 3. BMI / Cân nặng
    if (input.bmi !== undefined && input.bmi !== null && input.bmi >= 25.0) {
      redFlags.push({
        metric: 'BMI_OBESITY',
        level: 'WARNING',
        title: 'Chỉ số khối cơ thể (BMI) ở mức thừa cân / béo phì',
        value: `BMI: ${input.bmi}`,
      });
    }

    // 4. Đường huyết đói
    if (input.glucoseFasting !== undefined && input.glucoseFasting !== null && input.glucoseFasting >= 7.0) {
      redFlags.push({
        metric: 'BLOOD_GLUCOSE',
        level: 'DANGER',
        title: 'Đường huyết đói vượt ngưỡng bình thường',
        value: `${input.glucoseFasting} mmol/L`,
      });
    }

    // 5. Mỡ máu (Cholesterol)
    if (input.totalCholesterol !== undefined && input.totalCholesterol !== null && input.totalCholesterol >= 5.5) {
      redFlags.push({
        metric: 'LIPID_CHOLESTEROL',
        level: 'WARNING',
        title: 'Mỡ máu (Total Cholesterol) tăng cao',
        value: `${input.totalCholesterol} mmol/L`,
      });
    }

    // 6. Tổn thương cơ quan đích
    if (
      input.hasRetinopathy ||
      input.hasSilentBrainInfarct ||
      input.hasLeftVentricularHypertrophy ||
      input.hasAlbuminuria ||
      (input.egfr !== undefined && input.egfr !== null && input.egfr < 60)
    ) {
      redFlags.push({
        metric: 'ORGAN_DAMAGE',
        level: 'DANGER',
        title: 'Phát hiện dấu hiệu tổn thương cơ quan đích',
        value: 'Có tổn thương cơ quan đích',
      });
    }

    const hasWarningAlert = redFlags.length > 0;
    return { hasWarningAlert, redFlags };
  }

  /**
   * Helper to estimate preliminary risk level from clinical indicators.
   *
   * @param input - RiskFactorAssessmentInput
   * @returns { preliminaryLevel: VnDoctorRiskLevel; preliminaryScore: number }
   */
  public estimatePreliminaryRisk(input: Partial<RiskFactorAssessmentInput>): {
    preliminaryLevel: VnDoctorRiskLevel;
    preliminaryScore: number;
  } {
    // 1. Extreme risk criteria (Very High)
    if (
      input.hasRetinopathy ||
      input.hasSilentBrainInfarct ||
      (input.egfr !== undefined && input.egfr !== null && input.egfr < 30) ||
      (input.acr !== undefined && input.acr !== null && input.acr >= 300) ||
      (input.systolicBp !== undefined && input.systolicBp !== null && input.systolicBp >= 180)
    ) {
      return { preliminaryLevel: VnDoctorRiskLevel.VERY_HIGH, preliminaryScore: 15.0 };
    }

    // 2. High risk criteria
    if (
      input.hasLeftVentricularHypertrophy ||
      input.hasAlbuminuria ||
      (input.egfr !== undefined && input.egfr !== null && input.egfr < 60) ||
      (input.acr !== undefined && input.acr !== null && input.acr >= 30) ||
      (input.systolicBp !== undefined && input.systolicBp !== null && input.systolicBp >= 140) ||
      (input.totalCholesterol !== undefined && input.totalCholesterol !== null && input.totalCholesterol >= 5.5) ||
      input.isSmoking
    ) {
      return { preliminaryLevel: VnDoctorRiskLevel.HIGH, preliminaryScore: 8.0 };
    }

    // 3. Low risk
    return { preliminaryLevel: VnDoctorRiskLevel.LOW, preliminaryScore: 1.5 };
  }

  /**
   * Create a new Risk Factor Assessment Input and return the resulting assessment with red flag highlights.
   *
   * @param dto - CreateRiskAssessmentDto
   * @param accountId - Optional App account ID for patient self-submission
   * @returns Created assessment result with red flags
   */
  async create(dto: CreateRiskAssessmentDto, accountId?: string): Promise<RiskAssessmentResultWithRedFlags> {
    const profile = await this.healthProfileRepo.findOne({
      where: { id: dto.healthProfileId },
    });

    if (!profile) {
      throw new NotFound(`Hồ sơ sức khỏe ${dto.healthProfileId} không tồn tại`);
    }

    if (accountId && profile.accountId !== accountId) {
      throw new Forbidden('Bạn không có quyền thực hiện đánh giá cho hồ sơ sức khỏe này');
    }

    if (dto.facilityId) {
      const facility = await this.facilityRepo.findOne({
        where: { id: dto.facilityId },
      });
      if (!facility) {
        throw new NotFound(`Cơ sở y tế ${dto.facilityId} không tồn tại`);
      }
    }

    let calculatedBmi = dto.bmi;
    if (!calculatedBmi && dto.heightCm && dto.weightKg && dto.heightCm > 0) {
      const heightM = dto.heightCm / 100;
      calculatedBmi = Number((dto.weightKg / (heightM * heightM)).toFixed(2));
    }

    const input = this.inputRepo.create({
      healthProfileId: dto.healthProfileId,
      facilityId: dto.facilityId ?? null,
      hasUnderlyingDisease: dto.hasUnderlyingDisease ?? false,
      chronicDiseaseIds: dto.chronicDiseaseIds ?? [],
      hasLeftVentricularHypertrophy: dto.hasLeftVentricularHypertrophy ?? false,
      hasAlbuminuria: dto.hasAlbuminuria ?? false,
      hasRetinopathy: dto.hasRetinopathy ?? false,
      hasSilentBrainInfarct: dto.hasSilentBrainInfarct ?? false,
      egfr: dto.egfr ?? null,
      acr: dto.acr ?? null,
      heightCm: dto.heightCm ?? null,
      weightKg: dto.weightKg ?? null,
      bmi: calculatedBmi ?? null,
      systolicBp: dto.systolicBp ?? null,
      diastolicBp: dto.diastolicBp ?? null,
      isSmoking: dto.isSmoking ?? false,
      totalCholesterol: dto.totalCholesterol ?? null,
      hdlCholesterol: dto.hdlCholesterol ?? null,
      ldlCholesterol: dto.ldlCholesterol ?? null,
      triglycerides: dto.triglycerides ?? null,
      glucoseFasting: dto.glucoseFasting ?? null,
      status: dto.status ?? AssessmentStatus.SUBMITTED,
      assessmentDate: new Date(),
    });

    const savedInput = await this.inputRepo.save(input);

    // Auto-generate preliminary assessment result from medical dictionary
    const { preliminaryLevel, preliminaryScore } = this.estimatePreliminaryRisk(savedInput);
    const initialResult = this.resultRepo.create({
      assessmentInputId: savedInput.id,
      riskScore: preliminaryScore,
      riskLevel: preliminaryLevel,
      conclusion: null,
      recommendations: null,
      evaluatedAt: new Date(),
    });

    const savedResult = await this.resultRepo.save(initialResult);

    // Compute red flags for UI highlighting
    const { hasWarningAlert, redFlags } = this.calculateRedFlags(savedInput);

    return Object.assign(savedResult, {
      hasWarningAlert,
      redFlags,
    });
  }

  /**
   * Doctor evaluates assessment input and confirms final risk score & recommendations.
   *
   * @param id - Assessment input UUID
   * @param dto - EvaluateRiskAssessmentDto
   * @param doctorId - Staff User UUID of evaluating doctor
   * @returns Updated Assessment result with red flags
   */
  async evaluate(
    id: string,
    dto: EvaluateRiskAssessmentDto,
    doctorId: string,
  ): Promise<RiskAssessmentResultWithRedFlags> {
    const input = await this.inputRepo.findOne({
      where: { id },
      relations: ['assessmentResult'],
    });

    if (!input) {
      throw new NotFound(`Phiếu đánh giá nguy cơ với id ${id} không tồn tại`);
    }

    let result = input.assessmentResult;
    if (!result) {
      result = this.resultRepo.create({
        assessmentInputId: input.id,
      });
    }

    result.doctorId = doctorId;
    result.riskLevel = dto.riskLevel;
    if (dto.riskScore !== undefined) result.riskScore = dto.riskScore;
    if (dto.conclusion !== undefined) result.conclusion = dto.conclusion;
    if (dto.recommendations !== undefined) result.recommendations = dto.recommendations;
    result.evaluatedAt = new Date();

    const savedResult = await this.resultRepo.save(result);

    input.status = AssessmentStatus.EVALUATED;
    await this.inputRepo.save(input);

    const fullResult = (await this.resultRepo.findOne({
      where: { id: savedResult.id },
      relations: ['doctor'],
    })) as RiskFactorAssessmentResult;

    const { hasWarningAlert, redFlags } = this.calculateRedFlags(input);

    return Object.assign(fullResult, {
      hasWarningAlert,
      redFlags,
    });
  }

  /**
   * Retrieve list of risk assessments with filtering & pagination.
   *
   * @param query - QueryRiskAssessmentDto
   * @param accountId - Optional account ID for patient access
   * @returns Paginated assessment results
   */
  async findAll(
    query: QueryRiskAssessmentDto,
    accountId?: string,
  ): Promise<{ data: RiskFactorAssessmentResult[]; total: number; page: number; limit: number }> {
    const qb = this.resultRepo
      .createQueryBuilder('result')
      .leftJoinAndSelect('result.doctor', 'doctor')
      .leftJoinAndSelect('result.assessmentInput', 'input')
      .leftJoinAndSelect('input.healthProfile', 'profile')
      .leftJoinAndSelect('input.facility', 'facility');

    if (accountId) {
      qb.andWhere('profile.accountId = :accountId', { accountId });
    }

    if (query.healthProfileId) {
      qb.andWhere('input.healthProfileId = :healthProfileId', { healthProfileId: query.healthProfileId });
    }

    if (query.facilityId) {
      qb.andWhere('input.facilityId = :facilityId', { facilityId: query.facilityId });
    }

    if (query.doctorId) {
      qb.andWhere('result.doctorId = :doctorId', { doctorId: query.doctorId });
    }

    if (query.status) {
      qb.andWhere('input.status = :status', { status: query.status });
    }

    if (query.riskLevel) {
      qb.andWhere('result.riskLevel = :riskLevel', { riskLevel: query.riskLevel });
    }

    if (query.fromDate && query.toDate) {
      qb.andWhere('input.assessmentDate BETWEEN :fromDate AND :toDate', {
        fromDate: query.fromDate,
        toDate: query.toDate,
      });
    } else if (query.fromDate) {
      qb.andWhere('input.assessmentDate >= :fromDate', { fromDate: query.fromDate });
    } else if (query.toDate) {
      qb.andWhere('input.assessmentDate <= :toDate', { toDate: query.toDate });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    qb.orderBy('result.evaluatedAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Retrieve a single risk assessment result by Input ID with red flags.
   *
   * @param id - Assessment input UUID
   * @param accountId - Optional account ID for patient access
   * @returns RiskFactorAssessmentResult with doctor details and red flags
   */
  async findOne(id: string, accountId?: string): Promise<RiskAssessmentResultWithRedFlags> {
    const input = await this.inputRepo.findOne({
      where: { id },
      relations: ['healthProfile'],
    });

    if (!input) {
      throw new NotFound(`Phiếu đánh giá nguy cơ với id ${id} không tồn tại`);
    }

    if (accountId && input.healthProfile && input.healthProfile.accountId !== accountId) {
      throw new Forbidden('Bạn không có quyền xem phiếu đánh giá này');
    }

    const result = await this.resultRepo.findOne({
      where: { assessmentInputId: id },
      relations: ['doctor'],
    });

    if (!result) {
      throw new NotFound(`Kết quả đánh giá nguy cơ cho phiếu ${id} chưa được tạo`);
    }

    const { hasWarningAlert, redFlags } = this.calculateRedFlags(input);

    return Object.assign(result, {
      hasWarningAlert,
      redFlags,
    });
  }
}
