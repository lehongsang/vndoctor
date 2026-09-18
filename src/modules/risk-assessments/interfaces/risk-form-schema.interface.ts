/**
 * Interface cho Dynamic JSON Schema Form - Phân tầng nguy cơ y tế.
 */

export type FormFieldType =
  | 'boolean'
  | 'number'
  | 'string'
  | 'select'
  | 'radio'
  | 'checkbox';

export interface FormFieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface FormFieldOption {
  label: string;
  value: string | number | boolean;
}

export interface FormFieldSchema {
  code: string;
  label: string;
  type: FormFieldType;
  unit?: string;
  description?: string;
  defaultValue?: unknown;
  disabled?: boolean;
  fixedReason?: string;
  validation?: FormFieldValidation;
  options?: FormFieldOption[];
  dependsOn?: {
    field: string;
    value: unknown;
  };
}

export interface FormSectionSchema {
  code: 'GENERAL_METRICS' | 'TARGET_ORGAN_DAMAGE' | 'CHRONIC_DISEASES';
  title: string;
  description?: string;
  fields: FormFieldSchema[];
}

export interface DynamicFormSchemaResponse {
  formCode: 'RISK_FACTOR_STRATIFICATION';
  formTitle: string;
  version: string;
  patientInfo?: {
    healthProfileId: string;
    fullName: string;
    dob: string;
    age: number;
    gender: string;
    recordedChronicDiseases?: Array<{
      id: string;
      code?: string;
      name: string;
      icd10Code?: string;
    }>;
  };
  sections: FormSectionSchema[];
}
