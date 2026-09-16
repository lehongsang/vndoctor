/**
 * Blood pressure evaluation outcome according to VNHA guidelines.
 */
export interface BloodPressureEvaluation {
  level: string;
  label: string;
  subType?: string | null;
  warningMessage?: string | null;
  isDanger: boolean;
}

/**
 * Classifies blood pressure readings based on VNHA (Vietnam Heart Association) criteria.
 *
 * @param sys - Systolic blood pressure (Huyết áp tâm thu in mmHg)
 * @param dia - Diastolic blood pressure (Huyết áp tâm trương in mmHg)
 * @returns Structured evaluation result
 */
export function classifyBloodPressure(sys: number, dia: number): BloodPressureEvaluation {
  // Case 1: All cases where DIA >= SYS (Measurement error)
  if (dia >= sys) {
    return {
      level: 'INVALID_DATA',
      label: 'Lỗi',
      subType: null,
      warningMessage: 'Huyết áp tâm trương không thể lớn hơn hoặc bằng tâm thu. Vui lòng kiểm tra và đo lại.',
      isDanger: false,
    };
  }

  // Case 2 & 3: Dangerous low / measurement error warning (Cảnh báo 1)
  if ((sys < 70 && dia < 70) || (sys >= 70 && dia < 40)) {
    return {
      level: 'CRITICAL_DANGER',
      label: 'Cảnh báo 1',
      subType: null,
      warningMessage: 'Tình trạng HA nguy hiểm hoặc nhập lỗi, hãy nhập lại chỉ số huyết áp hoặc liên hệ nhân viên y tế',
      isDanger: true,
    };
  }

  // Case 4 & 5: Low Blood Pressure (SYS: 70 - 89)
  if (sys >= 70 && sys <= 89) {
    if (dia >= 40 && dia <= 60) {
      return {
        level: 'LOW_DIASTOLIC',
        label: 'Huyết áp tâm trương thấp',
        subType: null,
        isDanger: false,
      };
    }
    if (dia > 60 && dia <= 84) {
      return {
        level: 'LOW_SYSTOLIC',
        label: 'Huyết áp tâm thu thấp',
        subType: null,
        isDanger: false,
      };
    }
  }

  // Case 6 to 10: SYS: 90 - 129
  if (sys >= 90 && sys <= 129) {
    if (dia < 85) {
      return { level: 'NORMAL', label: 'Huyết áp không tăng', subType: null, isDanger: false };
    }
    if (dia >= 85 && dia <= 89) {
      return { level: 'PRE_HYPERTENSION', label: 'Tiền THA', subType: null, isDanger: false };
    }
    if (dia >= 90 && dia <= 99) {
      return { level: 'STAGE_1', label: 'THA độ 1', subType: 'THA tâm trương đơn độc', isDanger: false };
    }
    if (dia >= 100 && dia <= 109) {
      return { level: 'STAGE_2', label: 'THA độ 2', subType: 'THA tâm trương đơn độc', isDanger: false };
    }
    if (dia >= 110) {
      return { level: 'STAGE_3', label: 'THA độ 3', subType: 'THA tâm trương đơn độc', isDanger: true };
    }
  }

  // Case 11 to 15: SYS: 130 - 139 (Pre-hypertension)
  if (sys >= 130 && sys <= 139) {
    if (dia < 85) {
      return { level: 'PRE_HYPERTENSION', label: 'Tiền THA', subType: null, isDanger: false };
    }
    if (dia >= 85 && dia <= 89) {
      return { level: 'PRE_HYPERTENSION', label: 'Tiền THA', subType: null, isDanger: false };
    }
    if (dia >= 90 && dia <= 99) {
      return { level: 'STAGE_1', label: 'THA độ 1', subType: 'THA tâm trương đơn độc', isDanger: false };
    }
    if (dia >= 100 && dia <= 109) {
      return { level: 'STAGE_2', label: 'THA độ 2', subType: 'THA tâm trương đơn độc', isDanger: false };
    }
    if (dia >= 110) {
      return { level: 'STAGE_3', label: 'THA độ 3', subType: 'THA tâm trương đơn độc', isDanger: true };
    }
  }

  // Case 16 to 20: SYS: 140 - 159 (Stage 1 Hypertension)
  if (sys >= 140 && sys <= 159) {
    if (dia < 85) {
      return { level: 'STAGE_1', label: 'THA độ 1', subType: 'THA tâm THU đơn độc', isDanger: false };
    }
    if (dia >= 85 && dia <= 89) {
      return { level: 'STAGE_1', label: 'THA độ 1', subType: 'THA tâm THU đơn độc', isDanger: false };
    }
    if (dia >= 90 && dia <= 99) {
      return { level: 'STAGE_1', label: 'THA độ 1', subType: null, isDanger: false };
    }
    if (dia >= 100 && dia <= 109) {
      return { level: 'STAGE_2', label: 'THA độ 2', subType: null, isDanger: false };
    }
    if (dia >= 110) {
      return { level: 'STAGE_3', label: 'THA độ 3', subType: null, isDanger: true };
    }
  }

  // Case 21 to 25: SYS: 160 - 179 (Stage 2 Hypertension)
  if (sys >= 160 && sys <= 179) {
    if (dia < 85) {
      return { level: 'STAGE_2', label: 'THA độ 2', subType: 'THA tâm THU đơn độc', isDanger: false };
    }
    if (dia >= 85 && dia <= 89) {
      return { level: 'STAGE_2', label: 'THA độ 2', subType: 'THA tâm THU đơn độc', isDanger: false };
    }
    if (dia >= 90 && dia <= 99) {
      return { level: 'STAGE_2', label: 'THA độ 2', subType: null, isDanger: false };
    }
    if (dia >= 100 && dia <= 109) {
      return { level: 'STAGE_2', label: 'THA độ 2', subType: null, isDanger: false };
    }
    if (dia >= 110) {
      return { level: 'STAGE_3', label: 'THA độ 3', subType: null, isDanger: true };
    }
  }

  // Case 26 to 30: SYS >= 180 (Stage 3 Hypertension)
  if (sys >= 180) {
    if (dia < 85) {
      return { level: 'STAGE_3', label: 'THA độ 3', subType: 'THA tâm THU đơn độc', isDanger: true };
    }
    if (dia >= 85 && dia <= 89) {
      return { level: 'STAGE_3', label: 'THA độ 3', subType: 'THA tâm THU đơn độc', isDanger: true };
    }
    if (dia >= 90 && dia <= 99) {
      return { level: 'STAGE_3', label: 'THA độ 3', subType: null, isDanger: true };
    }
    if (dia >= 100 && dia <= 109) {
      return { level: 'STAGE_3', label: 'THA độ 3', subType: null, isDanger: true };
    }
    if (dia >= 110) {
      return { level: 'STAGE_3', label: 'THA độ 3', subType: null, isDanger: true };
    }
  }

  return {
    level: 'UNKNOWN',
    label: 'Chưa xác định',
    subType: null,
    isDanger: false,
  };
}
