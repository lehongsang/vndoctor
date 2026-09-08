/**
 * Staff role for VNDoctor Medical CMS
 */
export enum StaffRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  TECHNICIAN = 'TECHNICIAN',
  STAFF = 'STAFF',
}

/**
 * Facility level / hierarchy type for medical facilities
 */
export enum FacilityType {
  PROVINCIAL_HOSPITAL = 'PROVINCIAL_HOSPITAL',
  DISTRICT_HOSPITAL = 'DISTRICT_HOSPITAL',
  COMMUNE_HEALTH_STATION = 'COMMUNE_HEALTH_STATION',
  CLINIC = 'CLINIC',
  OTHER = 'OTHER',
}

/**
 * Relationship for Health Profile
 */
export enum ProfileRelationship {
  SELF = 'SELF',
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  CHILD = 'CHILD',
  SPOUSE = 'SPOUSE',
  OTHER = 'OTHER',
}

/**
 * Gender
 */
export enum ProfileGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

/**
 * Blood Type
 */
export enum ProfileBloodType {
  A = 'A',
  B = 'B',
  AB = 'AB',
  O = 'O',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Status of facility patient link
 */
export enum FacilityPatientLinkStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  UNLINKED = 'UNLINKED',
}

/**
 * Risk factor assessment input status
 */
export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  EVALUATED = 'EVALUATED',
  CANCELLED = 'CANCELLED',
}

/**
 * 10-year Cardiovascular / Metabolic Risk Level (Matching medical dictionary)
 */
export enum VnDoctorRiskLevel {
  LOW = 'LOW',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

/**
 * Examination record status
 */
export enum ExaminationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Personal health tracker metric types
 */
export enum HealthMetricType {
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  HEART_RATE = 'HEART_RATE',
  BLOOD_GLUCOSE = 'BLOOD_GLUCOSE',
  SPO2 = 'SPO2',
  BODY_TEMPERATURE = 'BODY_TEMPERATURE',
  WEIGHT = 'WEIGHT',
}

/**
 * Patient treatment target status
 */
export enum PatientTargetStatus {
  DRAFT = 'DRAFT',
  DOCTOR_VERIFIED = 'DOCTOR_VERIFIED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Treatment plan status
 */
export enum VnDoctorPlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DISCONTINUED = 'DISCONTINUED',
}

/**
 * Care Package classification type
 */
export enum CarePackageType {
  STANDARD = 'STANDARD',
  VIP = 'VIP',
}

/**
 * Care Package operational status
 */
export enum CarePackageStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

