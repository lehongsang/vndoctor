/**
 * Types and interfaces for the OCR service module.
 */

export type OcrEngineType = 'rapidocr' | 'tesseract';

export interface OcrPdfOptions {
  /**
   * Bắt buộc chạy OCR ngay cả khi PDF đã có text stream.
   * @default false
   */
  force_ocr?: boolean;

  /**
   * Độ phân giải render ảnh từ PDF (DPI).
   * @default 150
   */
  dpi?: number;

  /**
   * Ngôn ngữ OCR (vd: 'vie+eng', 'vie', 'eng').
   * @default 'vie+eng'
   */
  lang?: string;

  /**
   * Engine OCR sử dụng ('rapidocr' | 'tesseract').
   * @default 'rapidocr'
   */
  engine?: OcrEngineType;
}

export interface OcrMedicalRecordStructuredData {
  patient_name?: string;
  dob?: string;
  gender?: string;
  address?: string;
  admission_date?: string;
  discharge_date?: string;
  diagnosis?: string;
  icd10_code?: string;
  department?: string;
  hospital_name?: string;
  physician_name?: string;
  summary_treatment?: string;
  vital_signs?: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    spo2?: number;
    weight?: number;
    height?: number;
  };
  lab_results?: Array<{
    test_name: string;
    result: string;
    unit?: string;
    reference_range?: string;
  }>;
  prescriptions?: Array<{
    drug_name: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    quantity?: string;
  }>;
  [key: string]: unknown;
}

export interface OcrPdfResponse {
  success: boolean;
  message?: string;
  data?: OcrMedicalRecordStructuredData;
  raw_text?: string;
  page_count?: number;
  processing_time_ms?: number;
  [key: string]: unknown;
}

export interface OcrCccdResponse {
  success: boolean;
  message?: string;
  data?: {
    id_number?: string;
    full_name?: string;
    dob?: string;
    gender?: string;
    nationality?: string;
    home_town?: string;
    residence?: string;
    issue_date?: string;
    expiry_date?: string;
    qr_data?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface OcrHealthResponse {
  status: string;
  supported_apis?: Array<{
    endpoint: string;
    description: string;
  }>;
  [key: string]: unknown;
}
