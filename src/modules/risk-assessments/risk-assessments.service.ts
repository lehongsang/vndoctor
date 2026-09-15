import { AssessmentStatus, ProfileGender, VnDoctorRiskLevel } from '@/commons/enums/vndoctor.enum';
import { ErrorCode, Forbidden, NotFound } from '@/commons/exceptions';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { ChronicDisease } from '@/modules/chronic-diseases/entities/chronic-disease.entity';
import { ProfileChronicDisease } from '@/modules/chronic-diseases/entities/profile-chronic-disease.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRiskAssessmentDto, EvaluateRiskAssessmentDto, QueryRiskAssessmentDto } from './dtos';
import { RiskFactorAssessmentInput } from './entities/risk-factor-assessment-input.entity';
import { RiskFactorAssessmentResult } from './entities/risk-factor-assessment-result.entity';
import { RiskDictionaryService } from './services/risk-dictionary.service';
import { DynamicFormSchemaResponse, FormSectionSchema } from './interfaces/risk-form-schema.interface';
import { DEFAULT_RISK_FACTOR_FORM_SECTIONS } from './constants/risk-form-schema.constant';

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
 * Tích hợp tra cứu từ điển y khoa 2 luồng và quản lý Form Động Auto-fill & Lock.
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
    @InjectRepository(ChronicDisease)
    private readonly chronicDiseaseRepo: Repository<ChronicDisease>,
    @InjectRepository(ProfileChronicDisease)
    private readonly profileChronicDiseaseRepo: Repository<ProfileChronicDisease>,
    private readonly riskDictionaryService: RiskDictionaryService,
  ) {}

  /**
   * Trả về Dynamic JSON Schema của Form Phân Tầng Nguy Cơ (RISK_FACTOR_STRATIFICATION).
   * Tự động điền tuổi, giới tính và KHÓA (disabled: true) các trường bệnh nền đã có trong hồ sơ sức khỏe.
   *
   * @param healthProfileId - ID hồ sơ sức khỏe cá nhân
   * @param accountId - Optional account ID for patient access check
   */
  async getFormSchema(
    healthProfileId: string,
    accountId?: string,
  ): Promise<DynamicFormSchemaResponse> {
    const profile = await this.healthProfileRepo.findOne({
      where: { id: healthProfileId },
      relations: ['profileChronicDisease'],
    });

    if (!profile) {
      throw new NotFound(ErrorCode.HEALTH_PROFILE_NOT_FOUND, 'Không tìm thấy hồ sơ sức khỏe bệnh nhân');
    }

    if (accountId && profile.accountId && profile.accountId !== accountId) {
      throw new Forbidden(ErrorCode.HEALTH_PROFILE_ACCESS_DENIED, 'Bạn không có quyền truy cập hồ sơ này');
    }

    // 1. Tính toán tuổi thật từ dob
    let calculatedAge = 45;
    if (profile.dob) {
      const birthDate = new Date(profile.dob);
      const today = new Date();
      calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
    }

    const genderText = profile.gender === ProfileGender.FEMALE ? 'Nữ' : 'Nam';

    // 2. Kiểm tra danh sách bệnh nền đã ghi nhận
    const diseaseCodes = new Set<string>();
    const diseaseNames = new Set<string>();

    if (profile.profileChronicDisease?.diseaseIds?.length) {
      const diseases = await this.chronicDiseaseRepo.findByIds(profile.profileChronicDisease.diseaseIds);
      for (const d of diseases) {
        diseaseCodes.add(d.code?.toUpperCase() || '');
        diseaseNames.add(d.name?.toLowerCase() || '');
      }
    }

    const hasRecordedDiabetes =
      diseaseCodes.has('DIABETES') ||
      Array.from(diseaseNames).some((n) => n.includes('đái tháo đường') || n.includes('tiểu đường'));

    const hasRecordedStroke =
      diseaseCodes.has('STROKE') ||
      Array.from(diseaseNames).some((n) => n.includes('đột quỵ') || n.includes('tai biến'));

    const hasRecordedHypertension =
      diseaseCodes.has('HYPERTENSION') ||
      Array.from(diseaseNames).some((n) => n.includes('tăng huyết áp') || n.includes('huyết áp cao'));

    const hasAnyUnderlying = hasRecordedDiabetes || hasRecordedStroke || hasRecordedHypertension || diseaseCodes.size > 0;

    // 3. Clone và gán metadata Auto-fill & Lock vào Schema
    const sections: FormSectionSchema[] = JSON.parse(
      JSON.stringify(DEFAULT_RISK_FACTOR_FORM_SECTIONS),
    ) as FormSectionSchema[];

    for (const section of sections) {
      for (const field of section.fields) {
        if (field.code === 'age') {
          field.defaultValue = calculatedAge;
        } else if (field.code === 'gender') {
          field.defaultValue = genderText;
        } else if (field.code === 'hasUnderlyingDisease' && hasAnyUnderlying) {
          field.defaultValue = true;
        } else if (field.code === 'diabetes' && hasRecordedDiabetes) {
          field.defaultValue = true;
          field.disabled = true;
          field.fixedReason = 'Đã ghi nhận trong hồ sơ sức khỏe';
        } else if (field.code === 'stroke' && hasRecordedStroke) {
          field.defaultValue = true;
          field.disabled = true;
          field.fixedReason = 'Đã ghi nhận trong hồ sơ sức khỏe';
        }
      }
    }

    return {
      formCode: 'RISK_FACTOR_STRATIFICATION',
      formTitle: 'Đánh giá Phân tầng Yếu tố Nguy cơ Tim mạch & Chuyển hóa',
      version: '1.0',
      patientInfo: {
        healthProfileId: profile.id,
        fullName: profile.fullName,
        dob: profile.dob,
        age: calculatedAge,
        gender: genderText,
      },
      sections,
    };
  }

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
    const sbp = input.systolicBp;
    const dbp = input.diastolicBp;
    if (sbp !== undefined && sbp !== null) {
      if (sbp >= 160 || (dbp && dbp >= 100)) {
        redFlags.push({
          metric: 'BLOOD_PRESSURE',
          level: 'DANGER',
          title: 'Huyết áp tăng cao (Tăng huyết áp độ 2/3)',
          value: `${sbp}/${dbp ?? '--'} mmHg`,
        });
      } else if (sbp >= 140 || (dbp && dbp >= 90)) {
        redFlags.push({
          metric: 'BLOOD_PRESSURE',
          level: 'WARNING',
          title: 'Huyết áp vượt ngưỡng an toàn (Tăng huyết áp độ 1)',
          value: `${sbp}/${dbp ?? '--'} mmHg`,
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

    // 6. Tổn thương cơ quan đích & biến chứng nặng
    if (
      input.hasRetinopathy ||
      input.hasSilentBrainInfarct ||
      input.hasLeftVentricularHypertrophy ||
      input.hasAlbuminuria ||
      input.stroke ||
      input.hasMyocardialInfarction ||
      input.hasAcuteCoronarySyndrome ||
      (input.egfr !== undefined && input.egfr !== null && input.egfr < 60)
    ) {
      redFlags.push({
        metric: 'ORGAN_DAMAGE',
        level: 'DANGER',
        title: 'Phát hiện dấu hiệu tổn thương cơ quan đích hoặc biến chứng tim mạch',
        value: 'Có tổn thương cơ quan đích / Biến chứng tim mạch',
      });
    }

    const hasWarningAlert = redFlags.length > 0;
    return { hasWarningAlert, redFlags };
  }

  /**
   * Tạo mới Phiếu đánh giá phân tầng nguy cơ tim mạch và tra cứu kết quả từ từ điển y khoa.
   *
   * @param dto - CreateRiskAssessmentDto
   * @param accountId - Optional App account ID for patient self-submission
   * @returns Created assessment result with red flags
   */
  async create(dto: CreateRiskAssessmentDto, accountId?: string): Promise<RiskAssessmentResultWithRedFlags> {
    // Bước 1: Kiểm tra quyền sở hữu hồ sơ sức khỏe
    const profile = await this.healthProfileRepo.findOne({
      where: { id: dto.healthProfileId },
    });

    if (!profile) {
      throw new NotFound(ErrorCode.HEALTH_PROFILE_NOT_FOUND, 'Không tìm thấy hồ sơ sức khỏe');
    }

    if (accountId && profile.accountId && profile.accountId !== accountId) {
      throw new Forbidden(ErrorCode.HEALTH_PROFILE_ACCESS_DENIED, 'Bạn không có quyền thao tác trên hồ sơ này');
    }

    if (dto.facilityId) {
      const facility = await this.facilityRepo.findOne({
        where: { id: dto.facilityId },
      });
      if (!facility) {
        throw new NotFound(ErrorCode.FACILITY_NOT_FOUND, 'Không tìm thấy cơ sở y tế');
      }
    }

    // Bước 2: Chuẩn hóa dữ liệu đầu vào (Aliases & BMI)
    let calculatedBmi = dto.bmi;
    if (!calculatedBmi && dto.heightCm && dto.weightKg && dto.heightCm > 0) {
      const heightM = dto.heightCm / 100;
      calculatedBmi = Number((dto.weightKg / (heightM * heightM)).toFixed(2));
    }

    let calculatedAge = dto.age;
    if (!calculatedAge && profile.dob) {
      const birthDate = new Date(profile.dob);
      const today = new Date();
      calculatedAge = today.getFullYear() - birthDate.getFullYear();
    }

    const sbp = dto.sbp ?? dto.systolicBp ?? null;
    const cholesterol = dto.cholesterol ?? dto.totalCholesterol ?? null;
    const hdl = dto.hdl ?? dto.hdlCholesterol ?? null;
    const eGFR = dto.eGFR ?? dto.egfr ?? null;
    const hasAlbuminuria = dto.hasAlbuminuriaOrMicroalbuminuria ?? dto.hasAlbuminuria ?? false;
    const hasRetinopathy = dto.hasCarotidWallDamage ?? dto.hasRetinopathy ?? false;
    const hasSilentBrainInfarct = dto.hasSilentInfarct ?? dto.hasSilentBrainInfarct ?? false;

    // Bước 3: Tra cứu bộ luật phân tầng từ RiskDictionaryService
    let riskScore = 1.5;
    let riskLevel = VnDoctorRiskLevel.LOW;

    const hasUnderlying = Boolean(dto.hasUnderlyingDisease);

    if (!hasUnderlying) {
      // LUỒNG 1: KHÔNG CÓ BỆNH NỀN -> Tra cứu SCORE2 qua 6 chỉ số
      const score2Result = this.riskDictionaryService.calculateScore2({
        age: calculatedAge ?? 45,
        gender: dto.gender || (profile.gender === ProfileGender.FEMALE ? 'Nữ' : 'Nam'),
        isSmoking: dto.isSmoking ?? false,
        sbp: sbp ?? 120,
        cholesterol: cholesterol ? Number(cholesterol) : 5.0,
        hdl: hdl ? Number(hdl) : 1.2,
      });
      riskScore = score2Result.riskScore;
      riskLevel = score2Result.riskLevel;
    } else {
      // LUỒNG 2: CÓ BỆNH NỀN & BIẾN CHỨNG -> Tra cứu Non-ASCVD
      const nonAscvdResult = this.riskDictionaryService.calculateNonAscvd({
        hasLeftVentricularHypertrophy: dto.hasLeftVentricularHypertrophy,
        hasAlbuminuriaOrMicroalbuminuria: hasAlbuminuria,
        hasCarotidWallDamage: hasRetinopathy,
        hasSilentInfarct: hasSilentBrainInfarct,
        diabetes: dto.diabetes,
        diabetesDurationYears: dto.diabetesDurationYears,
        glycemicControl: dto.glycemicControl,
        eGFR: eGFR ? Number(eGFR) : undefined,
        acr: dto.acr ? Number(dto.acr) : undefined,
        stroke: dto.stroke,
        hasMyocardialInfarction: dto.hasMyocardialInfarction,
        hasAcuteCoronarySyndrome: dto.hasAcuteCoronarySyndrome,
        hasCoronaryArteryDisease: dto.hasCoronaryArteryDisease,
        hasTia: dto.hasTia,
        hasAorticAneurysm: dto.hasAorticAneurysm,
        hasPeripheralArteryDisease: dto.hasPeripheralArteryDisease,
        hasAtherosclerosis: dto.hasAtherosclerosis,
        hasFamilialHypercholesterolemia: dto.hasFamilialHypercholesterolemia,
      });
      riskScore = nonAscvdResult.riskScore;
      riskLevel = nonAscvdResult.riskLevel;
    }

    // Bước 4: Lưu bản ghi Input kèm Form Snapshot
    const input = this.inputRepo.create({
      healthProfileId: dto.healthProfileId,
      facilityId: dto.facilityId ?? null,
      hasUnderlyingDisease: hasUnderlying,
      chronicDiseaseIds: dto.chronicDiseaseIds ?? [],
      age: calculatedAge ?? null,
      gender: dto.gender ?? (profile.gender === ProfileGender.FEMALE ? 'Nữ' : 'Nam'),
      isSmoking: dto.isSmoking ?? false,
      systolicBp: sbp,
      diastolicBp: dto.diastolicBp ?? null,
      totalCholesterol: cholesterol,
      hdlCholesterol: hdl,
      ldlCholesterol: dto.ldlCholesterol ?? null,
      triglycerides: dto.triglycerides ?? null,
      glucoseFasting: dto.glucoseFasting ?? null,
      heightCm: dto.heightCm ?? null,
      weightKg: dto.weightKg ?? null,
      bmi: calculatedBmi ?? null,
      hasLeftVentricularHypertrophy: dto.hasLeftVentricularHypertrophy ?? false,
      hasAlbuminuria,
      hasRetinopathy,
      hasSilentBrainInfarct,
      egfr: eGFR,
      acr: dto.acr ?? null,
      diabetes: dto.diabetes ?? false,
      diabetesDurationYears: dto.diabetesDurationYears ?? null,
      glycemicControl: dto.glycemicControl ?? null,
      stroke: dto.stroke ?? false,
      hasMyocardialInfarction: dto.hasMyocardialInfarction ?? false,
      hasAcuteCoronarySyndrome: dto.hasAcuteCoronarySyndrome ?? false,
      hasCoronaryArteryDisease: dto.hasCoronaryArteryDisease ?? false,
      hasTia: dto.hasTia ?? false,
      hasAorticAneurysm: dto.hasAorticAneurysm ?? false,
      hasPeripheralArteryDisease: dto.hasPeripheralArteryDisease ?? false,
      hasAtherosclerosis: dto.hasAtherosclerosis ?? false,
      hasFamilialHypercholesterolemia: dto.hasFamilialHypercholesterolemia ?? false,
      formSnapshot: dto.formSnapshot || (dto as unknown as Record<string, unknown>),
      status: dto.status ?? AssessmentStatus.SUBMITTED,
      assessmentDate: new Date(),
    });

    const savedInput = await this.inputRepo.save(input);

    // Bước 5: Lưu kết quả phân tầng
    const initialResult = this.resultRepo.create({
      assessmentInputId: savedInput.id,
      riskScore,
      riskLevel,
      conclusion: null,
      recommendations: null,
      evaluatedAt: new Date(),
    });

    const savedResult = await this.resultRepo.save(initialResult);

    // Bước 6: Quét cờ đỏ cảnh báo và trả về
    const { hasWarningAlert, redFlags } = this.calculateRedFlags(savedInput);

    return Object.assign(savedResult, {
      hasWarningAlert,
      redFlags,
    });
  }

  /**
   * Bác sĩ thẩm định và kết luận mức độ nguy cơ.
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
      throw new NotFound(ErrorCode.RISK_ASSESSMENT_NOT_FOUND, 'Không tìm thấy phiếu đánh giá nguy cơ');
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
      throw new NotFound(ErrorCode.RISK_ASSESSMENT_NOT_FOUND, 'Không tìm thấy phiếu đánh giá nguy cơ');
    }

    if (accountId && input.healthProfile && input.healthProfile.accountId !== accountId) {
      throw new Forbidden(ErrorCode.HEALTH_PROFILE_ACCESS_DENIED, 'Bạn không có quyền truy cập kết quả này');
    }

    const result = await this.resultRepo.findOne({
      where: { assessmentInputId: id },
      relations: ['doctor'],
    });

    if (!result) {
      throw new NotFound(ErrorCode.RISK_ASSESSMENT_RESULT_NOT_FOUND, 'Không tìm thấy kết quả đánh giá');
    }

    const { hasWarningAlert, redFlags } = this.calculateRedFlags(input);

    return Object.assign(result, {
      hasWarningAlert,
      redFlags,
    });
  }

  /**
   * Soft delete a risk assessment input and its associated result.
   *
   * @param id - Assessment input UUID
   * @param accountId - Optional account ID for patient access
   * @returns Deletion status
   */
  async remove(id: string, accountId?: string): Promise<{ success: boolean; message: string }> {
    const input = await this.inputRepo.findOne({
      where: { id },
      relations: ['healthProfile', 'assessmentResult'],
    });

    if (!input) {
      throw new NotFound(ErrorCode.RISK_ASSESSMENT_NOT_FOUND, 'Không tìm thấy phiếu đánh giá nguy cơ');
    }

    if (accountId && input.healthProfile && input.healthProfile.accountId !== accountId) {
      throw new Forbidden(ErrorCode.HEALTH_PROFILE_ACCESS_DENIED, 'Bạn không có quyền xóa phiếu này');
    }

    if (input.assessmentResult) {
      await this.resultRepo.softRemove(input.assessmentResult);
    }
    await this.inputRepo.softRemove(input);

    return { success: true, message: 'Xóa phiếu đánh giá nguy cơ thành công' };
  }
}
