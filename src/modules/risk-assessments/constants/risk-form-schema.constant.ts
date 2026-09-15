import type { FormSectionSchema } from '../interfaces/risk-form-schema.interface';

/**
 * Cấu trúc Schema mặc định cho Form Phân tầng Nguy cơ Tim mạch & Chuyển hóa (RISK_FACTOR_STRATIFICATION).
 */
export const DEFAULT_RISK_FACTOR_FORM_SECTIONS: FormSectionSchema[] = [
  {
    code: 'GENERAL_METRICS',
    title: 'Khối 1: Thông tin chỉ số chung',
    description: 'Áp dụng cho người chưa ghi nhận bệnh mạn tính. Hệ thống tính điểm dựa trên 6 chỉ số sinh lý cơ bản.',
    fields: [
      {
        code: 'hasUnderlyingDisease',
        label: 'Có bệnh nền',
        type: 'boolean',
        defaultValue: false,
        validation: { required: true },
      },
      {
        code: 'age',
        label: 'Tuổi thật',
        type: 'number',
        validation: { required: true, min: 0, max: 200 },
      },
      {
        code: 'gender',
        label: 'Giới tính',
        type: 'select',
        options: [
          { label: 'Nam', value: 'Nam' },
          { label: 'Nữ', value: 'Nữ' },
        ],
        validation: { required: true },
      },
      {
        code: 'isSmoking',
        label: 'Thói quen hút thuốc lá',
        type: 'boolean',
        defaultValue: false,
        validation: { required: true },
      },
      {
        code: 'sbp',
        label: 'Huyết áp tâm thu',
        type: 'number',
        unit: 'mmHg',
        validation: { required: true, min: 50, max: 260 },
      },
      {
        code: 'cholesterol',
        label: 'Cholesterol toàn phần',
        type: 'number',
        unit: 'mmol/L',
        validation: { required: true, min: 1, max: 30 },
      },
      {
        code: 'hdl',
        label: 'HDL - Cholesterol',
        type: 'number',
        unit: 'mmol/L',
        validation: { required: true, min: 0.1, max: 10 },
      },
    ],
  },
  {
    code: 'TARGET_ORGAN_DAMAGE',
    title: 'Khối 2: Tổn thương cơ quan đích (Target Organ Damage)',
    description: 'Bỏ qua phần nhập 6 chỉ số cơ bản trên. Hiển thị danh sách các tổn thương cơ quan đích để tích chọn.',
    fields: [
      {
        code: 'hasLeftVentricularHypertrophy',
        label: 'Phì đại thất trái (trên ECG / siêu âm tim)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        code: 'hasAlbuminuriaOrMicroalbuminuria',
        label: 'Có Albumin / Microalbumin niệu',
        type: 'boolean',
        defaultValue: false,
      },
      {
        code: 'hasCarotidWallDamage',
        label: 'Tổn thương đáy mắt / thành mạch cảnh',
        type: 'boolean',
        defaultValue: false,
      },
      {
        code: 'hasSilentInfarct',
        label: 'Tổn thương thầm lặng trên não',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  },
  {
    code: 'CHRONIC_DISEASES',
    title: 'Khối 3: Bệnh lý mạn tính & Biến chứng tim mạch - thận (Chronic Diseases)',
    description: 'Danh sách các bệnh mạn tính và biến chứng chi tiết.',
    fields: [
      {
        code: 'diabetes',
        label: 'Có mắc đái tháo đường hay không',
        type: 'boolean',
        defaultValue: false,
      },
      {
        code: 'diabetesDurationYears',
        label: 'Số năm mắc đái tháo đường',
        type: 'number',
        unit: 'năm',
        validation: { min: 0, max: 100 },
        dependsOn: { field: 'diabetes', value: true },
      },
      {
        code: 'glycemicControl',
        label: 'Mức kiểm soát đường máu',
        type: 'select',
        options: [
          { label: 'Tốt', value: 'Tốt' },
          { label: 'Không tốt', value: 'Không tốt' },
        ],
        dependsOn: { field: 'diabetes', value: true },
      },
      {
        code: 'eGFR',
        label: 'Độ thanh thải cầu thận (eGFR)',
        type: 'number',
        unit: 'mL/phút/1.73m²',
        validation: { min: 0, max: 200 },
      },
      {
        code: 'acr',
        label: 'Tỷ lệ Albumin/Creatinin niệu (ACR)',
        type: 'number',
        unit: 'mg/g',
        validation: { min: 0, max: 5000 },
      },
      {
        code: 'stroke',
        label: 'Tiền sử đột quỵ não',
        type: 'boolean',
        defaultValue: false,
      },
      {
        code: 'hasMyocardialInfarction',
        label: 'Nhồi máu cơ tim',
        type: 'boolean',
        defaultValue: false,
      },
      {
        code: 'hasAcuteCoronarySyndrome',
        label: 'Hội chứng vành cấp',
        type: 'boolean',
        defaultValue: false,
      },
      {
        code: 'hasCoronaryArteryDisease',
        label: 'Bệnh lý động mạch vành',
        type: 'boolean',
        defaultValue: false,
      },
      {
        code: 'hasTia',
        label: 'Cơn thiếu máu não cục bộ thoáng qua (TIA)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        code: 'hasAorticAneurysm',
        label: 'Phình động mạch chủ',
        type: 'boolean',
        defaultValue: false,
      },
      {
        code: 'hasPeripheralArteryDisease',
        label: 'Bệnh mạch máu ngoại vi',
        type: 'boolean',
        defaultValue: false,
      },
      {
        code: 'hasAtherosclerosis',
        label: 'Vữa xơ mạch máu lớn',
        type: 'boolean',
        defaultValue: false,
      },
      {
        code: 'hasFamilialHypercholesterolemia',
        label: 'Tăng Cholesterol máu gia đình',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  },
];
