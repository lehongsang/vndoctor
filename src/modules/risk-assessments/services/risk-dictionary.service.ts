import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from '@/commons/logger/logger.service';
import { VnDoctorRiskLevel } from '@/commons/enums/vndoctor.enum';

export interface Score2DictionaryItem {
  lookupKey: string;
  riskLevel: VnDoctorRiskLevel | string;
  mortalityRate: number;
}

export interface NonAscvdDictionaryItem {
  lookupKey: string;
  riskLevel: VnDoctorRiskLevel | string;
}

export interface IcdScore2DictionaryItem {
  section?: string;
  score2Code: string;
  name: string;
  directIcd10Code?: string;
  directIcd10Name?: string;
  relatedIcd10Codes?: string[];
}

export interface Score2CalculationInput {
  age: number;
  gender: string; // 'Nam' | 'Nữ' | 'MALE' | 'FEMALE'
  isSmoking: boolean;
  sbp: number; // Huyết áp tâm thu (mmHg)
  cholesterol: number; // Cholesterol toàn phần (mmol/L)
  hdl: number; // HDL - Cholesterol (mmol/L)
}

export interface NonAscvdCalculationInput {
  hasLeftVentricularHypertrophy?: boolean;
  hasAlbuminuriaOrMicroalbuminuria?: boolean;
  hasCarotidWallDamage?: boolean;
  hasSilentInfarct?: boolean;
  diabetes?: boolean;
  diabetesDurationYears?: number;
  glycemicControl?: string; // 'Tốt' | 'Không tốt'
  eGFR?: number;
  acr?: number;
  stroke?: boolean;
  hasMyocardialInfarction?: boolean;
  hasAcuteCoronarySyndrome?: boolean;
  hasCoronaryArteryDisease?: boolean;
  hasTia?: boolean;
  hasAorticAneurysm?: boolean;
  hasPeripheralArteryDisease?: boolean;
  hasAtherosclerosis?: boolean;
  hasFamilialHypercholesterolemia?: boolean;
}

/**
 * Service quản lý nạp và tra cứu từ điển đánh giá phân tầng nguy cơ y tế:
 * 1. risk-score-dictionary.json (Tra cứu điểm SCORE2 cho người không có bệnh nền)
 * 2. risk-score-non-ascvd-dictionary.json (Tra cứu phân tầng cho người có bệnh nền / tổn thương cơ quan đích)
 * 3. icd10-score2-dictionary.json (Ánh xạ triệu chứng/bệnh lý sang mã score2Code)
 */
@Injectable()
export class RiskDictionaryService implements OnModuleInit {
  private readonly logger = new LoggerService(RiskDictionaryService.name);

  private readonly score2Map = new Map<string, Score2DictionaryItem>();
  private readonly nonAscvdMap = new Map<string, NonAscvdDictionaryItem>();
  private readonly icdMap = new Map<string, IcdScore2DictionaryItem>();

  onModuleInit(): void {
    this.loadDictionaries();
  }

  /**
   * Nạp toàn bộ từ điển JSON từ thư mục seeds vào bộ nhớ memory cache để tra cứu O(1).
   */
  public loadDictionaries(): void {
    try {
      const basePaths = [
        path.join(process.cwd(), 'src/database/seeds/data'),
        path.join(process.cwd(), 'dist/database/seeds/data'),
        path.resolve(__dirname, '../../../database/seeds/data'),
      ];

      const basePath = basePaths.find((p) => fs.existsSync(p));
      if (!basePath) {
        this.logger.warn('Không tìm thấy thư mục seeds data chứa từ điển y khoa.');
        return;
      }

      // 1. Load risk-score-dictionary.json
      const score2Path = path.join(basePath, 'risk-score-dictionary.json');
      if (fs.existsSync(score2Path)) {
        const score2Data = JSON.parse(fs.readFileSync(score2Path, 'utf8')) as Score2DictionaryItem[];
        this.score2Map.clear();
        for (const item of score2Data) {
          this.score2Map.set(item.lookupKey, item);
        }
        this.logger.log(`Nạp ${this.score2Map.size} mục từ điển SCORE2 (risk-score-dictionary.json)`);
      }

      // 2. Load risk-score-non-ascvd-dictionary.json
      const nonAscvdPath = path.join(basePath, 'risk-score-non-ascvd-dictionary.json');
      if (fs.existsSync(nonAscvdPath)) {
        const nonAscvdData = JSON.parse(fs.readFileSync(nonAscvdPath, 'utf8')) as NonAscvdDictionaryItem[];
        this.nonAscvdMap.clear();
        for (const item of nonAscvdData) {
          this.nonAscvdMap.set(item.lookupKey, item);
        }
        this.logger.log(`Nạp ${this.nonAscvdMap.size} mục từ điển Non-ASCVD (risk-score-non-ascvd-dictionary.json)`);
      }

      // 3. Load icd10-score2-dictionary.json
      const icdPath = path.join(basePath, 'icd10-score2-dictionary.json');
      if (fs.existsSync(icdPath)) {
        const icdData = JSON.parse(fs.readFileSync(icdPath, 'utf8')) as IcdScore2DictionaryItem[];
        this.icdMap.clear();
        for (const item of icdData) {
          this.icdMap.set(item.score2Code, item);
        }
        this.logger.log(`Nạp ${this.icdMap.size} mục ánh xạ ICD10 SCORE2 (icd10-score2-dictionary.json)`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Lỗi nạp từ điển phân tầng nguy cơ: ${msg}`);
    }
  }

  /**
   * Tính toán điểm nguy cơ và phân tầng cho Luồng KHÔNG CÓ BỆNH NỀN (SCORE2)
   * Ghép lookupKey theo định dạng: 1.x_2.x_3.x_4.x_5.x
   */
  public calculateScore2(input: Score2CalculationInput): {
    riskScore: number;
    riskLevel: VnDoctorRiskLevel;
    lookupKey: string;
  } {
    // 1. Phân nhóm tuổi (1.0 -> 1.9)
    let ageCode = '1.0';
    const age = input.age;
    if (age >= 80) ageCode = '1.9';
    else if (age >= 75) ageCode = '1.8';
    else if (age >= 70) ageCode = '1.7';
    else if (age >= 65) ageCode = '1.6';
    else if (age >= 60) ageCode = '1.5';
    else if (age >= 55) ageCode = '1.4';
    else if (age >= 50) ageCode = '1.3';
    else if (age >= 45) ageCode = '1.2';
    else if (age >= 40) ageCode = '1.1';
    else ageCode = '1.0';

    // 2. Thói quen hút thuốc (2.1: Không, 2.2: Có)
    const smokingCode = input.isSmoking ? '2.2' : '2.1';

    // 3. Phân tầng huyết áp tâm thu SBP (3.0: <140 mmHg, 3.1: >=140 mmHg)
    const sbpCode = input.sbp >= 140 ? '3.1' : '3.0';

    // 4. Cholesterol toàn phần (4.1 -> 4.4)
    let cholCode = '4.1';
    const chol = input.cholesterol;
    if (chol >= 6.0) cholCode = '4.4';
    else if (chol >= 5.0) cholCode = '4.3';
    else if (chol >= 4.0) cholCode = '4.2';
    else cholCode = '4.1';

    // 5. HDL-Cholesterol (5.4: >=1.6, 5.5: 1.3-1.5, 5.6: 1.0-1.2, 5.7: <1.0)
    let hdlCode = '5.7';
    const hdl = input.hdl;
    if (hdl >= 1.6) hdlCode = '5.4';
    else if (hdl >= 1.3) hdlCode = '5.5';
    else if (hdl >= 1.0) hdlCode = '5.6';
    else hdlCode = '5.7';

    // Ghép lookupKey
    const lookupKey = `${ageCode}_${smokingCode}_${sbpCode}_${cholCode}_${hdlCode}`;
    const matched = this.score2Map.get(lookupKey);

    if (matched) {
      return {
        riskScore: matched.mortalityRate,
        riskLevel: matched.riskLevel as VnDoctorRiskLevel,
        lookupKey,
      };
    }

    // Fallback nếu không có key chính xác: Dự đoán dựa trên SCORE2 tiêu chuẩn
    const fallbackScore = Math.min(
      30,
      Math.max(1, (age >= 65 ? 8 : 2) + (input.isSmoking ? 3 : 0) + (input.sbp >= 140 ? 3 : 0) + (chol >= 6.0 ? 2 : 0)),
    );
    const fallbackLevel =
      fallbackScore >= 10
        ? VnDoctorRiskLevel.VERY_HIGH
        : fallbackScore >= 5
          ? VnDoctorRiskLevel.HIGH
          : VnDoctorRiskLevel.LOW;

    return {
      riskScore: fallbackScore,
      riskLevel: fallbackLevel,
      lookupKey,
    };
  }

  /**
   * Tính toán phân tầng nguy cơ cho Luồng CÓ BỆNH NỀN & TỔN THƯƠNG CƠ QUAN ĐÍCH
   * Tra cứu theo risk-score-non-ascvd-dictionary.json
   */
  public calculateNonAscvd(input: NonAscvdCalculationInput): {
    riskScore: number;
    riskLevel: VnDoctorRiskLevel;
    matchedCodes: string[];
  } {
    const matchedCodes: string[] = [];

    // 1. Nhóm Bệnh tim mạch xơ vữa nặng (8.1 - 8.8) -> VERY_HIGH
    if (input.hasMyocardialInfarction) matchedCodes.push('8.1');
    if (input.hasAcuteCoronarySyndrome) matchedCodes.push('8.2');
    if (input.hasCoronaryArteryDisease) matchedCodes.push('8.3');
    if (input.stroke) matchedCodes.push('8.4');
    if (input.hasTia) matchedCodes.push('8.5');
    if (input.hasAorticAneurysm) matchedCodes.push('8.6');
    if (input.hasPeripheralArteryDisease) matchedCodes.push('8.7');
    if (input.hasAtherosclerosis) matchedCodes.push('8.8');

    // 2. Nhóm Bệnh thận mạn / eGFR / ACR (7.1 - 7.5)
    if (input.eGFR !== undefined && input.eGFR !== null) {
      if (input.eGFR < 30) {
        matchedCodes.push('7.4'); // Giai đoạn 4/5 -> VERY_HIGH
      } else if (input.eGFR < 45) {
        matchedCodes.push('7.5'); // Giai đoạn 3b -> VERY_HIGH
      } else if (input.eGFR < 60) {
        matchedCodes.push('7.2'); // Giai đoạn 3a -> HIGH
      }
    }
    if (input.acr !== undefined && input.acr !== null) {
      if (input.acr >= 300) {
        matchedCodes.push('7.4');
      } else if (input.acr >= 30 && !matchedCodes.some((c) => c.startsWith('7.'))) {
        matchedCodes.push('7.1');
      }
    }

    // 3. Nhóm Đái tháo đường & biến chứng (9.0 - 9.6)
    if (input.hasFamilialHypercholesterolemia) {
      matchedCodes.push('9.0');
    }
    if (input.diabetes) {
      const isComplicated =
        input.hasLeftVentricularHypertrophy ||
        input.hasAlbuminuriaOrMicroalbuminuria ||
        input.hasCarotidWallDamage ||
        input.hasSilentInfarct ||
        (input.eGFR !== undefined && input.eGFR < 60) ||
        (input.acr !== undefined && input.acr >= 30);

      const isLongDuration = (input.diabetesDurationYears ?? 0) >= 20;
      const isPoorControl = input.glycemicControl === 'Không tốt';

      if (isComplicated || isLongDuration || (isPoorControl && (input.diabetesDurationYears ?? 0) >= 10)) {
        matchedCodes.push('9.1_9.5'); // VERY_HIGH
      } else if ((input.diabetesDurationYears ?? 0) < 10) {
        matchedCodes.push('9.1_9.3_6.0_8.0'); // HIGH
      } else {
        matchedCodes.push('9.1'); // HIGH
      }
    }

    // 4. Nhóm Tổn thương cơ quan đích (6.1 - 6.4)
    if (input.hasLeftVentricularHypertrophy) matchedCodes.push('6.1');
    if (input.hasAlbuminuriaOrMicroalbuminuria) matchedCodes.push('6.2');
    if (input.hasCarotidWallDamage) matchedCodes.push('6.3');
    if (input.hasSilentInfarct) matchedCodes.push('6.4');

    // 5. Tra cứu mức nguy cơ cao nhất từ dictionary
    let highestLevel: VnDoctorRiskLevel = VnDoctorRiskLevel.LOW;
    let highestScore = 2.0;

    for (const code of matchedCodes) {
      const nonAscvdItem = this.nonAscvdMap.get(code);
      if (nonAscvdItem) {
        const itemLevel = String(nonAscvdItem.riskLevel);
        if (itemLevel === 'VERY_HIGH' || itemLevel === String(VnDoctorRiskLevel.VERY_HIGH)) {
          highestLevel = VnDoctorRiskLevel.VERY_HIGH;
          highestScore = 15.0;
          break; // Đã đạt mức cao nhất
        } else if (itemLevel === 'HIGH' || itemLevel === String(VnDoctorRiskLevel.HIGH)) {
          highestLevel = VnDoctorRiskLevel.HIGH;
          highestScore = 8.0;
        }
      } else {
        // Nếu là mã 8.x hoặc 7.4/7.5 -> VERY_HIGH
        if (code.startsWith('8.') || code === '7.4' || code === '7.5' || code.includes('9.5') || code.includes('9.6')) {
          highestLevel = VnDoctorRiskLevel.VERY_HIGH;
          highestScore = 15.0;
          break;
        } else if (code.startsWith('7.') || code.startsWith('6.') || code.startsWith('9.')) {
          highestLevel = VnDoctorRiskLevel.HIGH;
          highestScore = 8.0;
        }
      }
    }

    return {
      riskScore: highestScore,
      riskLevel: highestLevel,
      matchedCodes,
    };
  }
}
