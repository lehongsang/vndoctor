/**
 * Enum representing NAVI user roles in the system.
 */
export enum Role {
  /** System-wide administrator for WebAdmin. */
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
  /** Facility-scoped administrator for WebAdmin. */
  FACILITY_ADMIN = 'FACILITY_ADMIN',
  /** Monitoring doctor responsible for examinations and prescriptions. */
  DOCTOR_MONITOR = 'DOCTOR_MONITOR',
  /** Expert doctor responsible for consultation suggestions. */
  DOCTOR_EXPERT = 'DOCTOR_EXPERT',
  /** Nurse responsible for triage and ticket processing. */
  NURSE = 'NURSE',
  /** Patient using the NAVI app. */
  PATIENT = 'PATIENT',
  /** Family member monitoring a linked patient. */
  FAMILY = 'FAMILY',
}

export const ALL_ROLES = Object.values(Role);

/**
 * Risk level returned by the NAVI rule engine.
 */
export enum RiskLevel {
  LEVEL1 = 'LEVEL1',
  LEVEL2 = 'LEVEL2',
  LEVEL3 = 'LEVEL3',
  LEVEL4 = 'LEVEL4',
  LEVEL5 = 'LEVEL5',
}

/**
 * Supported health metric types for chronic disease monitoring.
 */
export enum VitalType {
  BP = 'BP',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  HEART_RATE = 'HEART_RATE',
  BLOOD_GLUCOSE = 'BLOOD_GLUCOSE',
  SPO2 = 'SPO2',
  TEMPERATURE = 'TEMPERATURE',
  WEIGHT = 'WEIGHT',
  SLEEP = 'SLEEP',
  LDL_C = 'LDL_C',
  RENAL = 'RENAL',
}

/**
 * Source of a health record submission.
 */
export enum HealthRecordInputSource {
  MANUAL = 'MANUAL',
  DEVICE_SYNC = 'DEVICE_SYNC',
}

/**
 * Common active/inactive status for NAVI master data.
 */
export enum RecordStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Facility level / hierarchy type for medical facilities.
 */
export enum FacilityType {
  /** Root / system-wide headquarters (e.g., VN Doctor HQ). */
  ROOT = 'ROOT',
  /** Provincial-level general hospital. */
  PROVINCIAL_HOSPITAL = 'PROVINCIAL_HOSPITAL',
  /** District-level hospital / medical center. */
  DISTRICT_HOSPITAL = 'DISTRICT_HOSPITAL',
  /** Commune / Ward health station. */
  COMMUNE_HEALTH_STATION = 'COMMUNE_HEALTH_STATION',
  /** Clinic or satellite examination point. */
  CLINIC = 'CLINIC',
  /** Other facility type. */
  OTHER = 'OTHER',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum BloodType {
  A_PLUS = 'A+',
  A_MINUS = 'A-',
  B_PLUS = 'B+',
  B_MINUS = 'B-',
  AB_PLUS = 'AB+',
  AB_MINUS = 'AB-',
  O_PLUS = 'O+',
  O_MINUS = 'O-',
}

export enum AssessmentTicketStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
}

export enum AssessmentActionTaken {
  SELF_HANDLED = 'SELF_HANDLED',
  TRANSFERRED_TO_DOCTOR = 'TRANSFERRED_TO_DOCTOR',
}

export enum RiskFactorAssessmentStatus {
  SUBMITTED = 'SUBMITTED',
  SYSTEM_REVIEWED = 'SYSTEM_REVIEWED',
  DOCTOR_VERIFIED = 'DOCTOR_VERIFIED',
  DOCTOR_REJECTED = 'DOCTOR_REJECTED',
}

export enum RiskFactorAssessmentReviewScopeStatus {
  PENDING = 'PENDING',
  DOCTOR_VERIFIED = 'DOCTOR_VERIFIED',
  DOCTOR_REJECTED = 'DOCTOR_REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum RiskFactorAssessmentSubmissionMode {
  SELF_ONLY = 'SELF_ONLY',
  SENT_TO_CARE_GROUP = 'SENT_TO_CARE_GROUP',
  SENT_TO_FACILITY_VISIT = 'SENT_TO_FACILITY_VISIT',
  STAFF_CREATED = 'STAFF_CREATED',
}

export enum RiskFactorAssessmentLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum TreatmentPlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum CareGroupStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum CareGroupMemberRole {
  OWNER = 'OWNER',
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  EXPERT = 'EXPERT',
  COORDINATOR = 'COORDINATOR',
}

export enum CareGroupMemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum CarePackageType {
  STANDARD = 'STANDARD',
  VIP = 'VIP',
}

export enum CarePackageStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum PatientCareSubscriptionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PatientCareRequestCategory {
  QUESTION = 'QUESTION',
  SYMPTOM = 'SYMPTOM',
  MEDICATION = 'MEDICATION',
  APPOINTMENT = 'APPOINTMENT',
  OTHER = 'OTHER',
}

export enum PatientCareRequestPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
}

export enum PatientCareRequestRoutingLevel {
  NURSE = 'NURSE',
  DOCTOR = 'DOCTOR',
}

export enum PatientCareRequestStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  RESPONDED = 'RESPONDED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum PatientCareRequestTimelineAction {
  CREATED = 'CREATED',
  VIEWED = 'VIEWED',
  STARTED = 'STARTED',
  RESPONDED = 'RESPONDED',
  ESCALATED_TO_DOCTOR = 'ESCALATED_TO_DOCTOR',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum CareSubscriptionOrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentSessionResourceType {
  CARE_SUBSCRIPTION_ORDER = 'CARE_SUBSCRIPTION_ORDER',
}

export enum PaymentSessionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum SosCaseStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

export enum SosTriggerType {
  AUTO_METRIC = 'auto_metric',
  PATIENT_MANUAL = 'patient_manual',
}

export enum SosCloseResult {
  STABILIZED = 'stabilized',
  TRANSFERRED_ER = 'transferred_er',
  COUNSELED = 'counseled',
  OTHER = 'other',
}

export enum SosTimelineEventType {
  CREATED = 'created',
  NOTIFIED = 'notified',
  ACCEPTED = 'accepted',
  NOTE_ADDED = 'note_added',
  TRANSFERRED = 'transferred',
  ESCALATED = 'escalated',
  CLOSED = 'closed',
}

export enum ExaminationStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED',
}

export enum FacilityVisitRegistrationStatus {
  REGISTERED = 'REGISTERED',
  ASSIGNED_TO_DOCTOR = 'ASSIGNED_TO_DOCTOR',
  IN_EXAMINATION = 'IN_EXAMINATION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ReferralStatus {
  PENDING = 'PENDING',
  RESPONDED = 'RESPONDED',
  FINALIZED = 'FINALIZED',
}

export enum PatientHealthProfileShareStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  REVOKED = 'REVOKED',
}

export enum PatientHealthProfileSharePermission {
  VIEW = 'VIEW',
  VIEW_AND_WRITE = 'VIEW_AND_WRITE',
}

export enum PatientHealthProfileLinkRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

export enum MessageType {
  TEXT = 'TEXT',
  MEDIA = 'MEDIA',
  SYSTEM = 'SYSTEM',
  REMINDER = 'REMINDER',
}

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum ConversationResourceType {
  MEDIA = 'MEDIA',
  FILE = 'FILE',
  LINK = 'LINK',
}

export enum ConversationMediaKind {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export enum ConversationLabelKind {
  SYSTEM = 'SYSTEM',
  CUSTOM = 'CUSTOM',
}

export enum ConversationLabelCategory {
  GENERAL = 'GENERAL',
  PATIENT_TO_STAFF = 'PATIENT_TO_STAFF',
  STAFF_TO_PATIENT = 'STAFF_TO_PATIENT',
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  RESCHEDULED_PENDING = 'RESCHEDULED_PENDING',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export enum AppointmentType {
  ROUTINE_CHECKUP = 'ROUTINE_CHECKUP', // Tái khám định kỳ
  SYMPTOMATIC_EXAM = 'SYMPTOMATIC_EXAM', // Khám triệu chứng
  ONLINE_CONSULTATION = 'ONLINE_CONSULTATION', // Tư vấn online
  IN_PERSON = 'IN_PERSON',
  TELEHEALTH = 'TELEHEALTH',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  ZALO_OA = 'ZALO_OA',
  PUSH = 'PUSH',
}

export enum NotificationDeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  RETRYING = 'RETRYING',
  FAILED = 'FAILED',
}

export enum NotificationCampaignStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  PARTIAL_FAILED = 'PARTIAL_FAILED',
}

export enum NotificationCampaignScheduleStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum NotificationCampaignRecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum NotificationCampaignRecipientStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  PARTIAL_FAILED = 'PARTIAL_FAILED',
}

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  EXPORT = 'EXPORT',
}

export enum PermissionEffect {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
}

export enum PermissionScope {
  SYSTEM = 'SYSTEM',
  FACILITY = 'FACILITY',
}

export enum PermissionCode {
  ADMIN_DASHBOARD_READ = 'ADMIN_DASHBOARD_READ',
  FACILITY_MANAGE = 'FACILITY_MANAGE',
  USER_MANAGE = 'USER_MANAGE',
  PERMISSION_MANAGE = 'PERMISSION_MANAGE',
  CATALOG_MANAGE = 'CATALOG_MANAGE',
  RISK_RULE_MANAGE = 'RISK_RULE_MANAGE',
  PATIENT_READ = 'PATIENT_READ',
  PATIENT_MANAGE = 'PATIENT_MANAGE',
  HEALTH_RECORD_CREATE = 'HEALTH_RECORD_CREATE',
  TREATMENT_TARGET_MANAGE = 'TREATMENT_TARGET_MANAGE',
  ASSESSMENT_READ = 'ASSESSMENT_READ',
  ASSESSMENT_HANDLE = 'ASSESSMENT_HANDLE',
  SOS_READ = 'SOS_READ',
  SOS_HANDLE = 'SOS_HANDLE',
  EXAMINATION_MANAGE = 'EXAMINATION_MANAGE',
  PRESCRIPTION_MANAGE = 'PRESCRIPTION_MANAGE',
  LAB_ORDER_MANAGE = 'LAB_ORDER_MANAGE',
  REFERRAL_CREATE = 'REFERRAL_CREATE',
  REFERRAL_RESPOND = 'REFERRAL_RESPOND',
  CHAT_READ = 'CHAT_READ',
  CHAT_SEND = 'CHAT_SEND',
  CHAT_GROUP_MANAGE = 'CHAT_GROUP_MANAGE',
  CHAT_LABEL_MANAGE = 'CHAT_LABEL_MANAGE',
  NOTIFICATION_READ = 'NOTIFICATION_READ',
  AUDIT_READ = 'AUDIT_READ',
  APPOINTMENT_READ = 'APPOINTMENT_READ',
  APPOINTMENT_MANAGE = 'APPOINTMENT_MANAGE',
  CARE_PACKAGE_VIEW = 'CARE_PACKAGE_VIEW',
  CARE_PACKAGE_CREATE = 'CARE_PACKAGE_CREATE',
  CARE_PACKAGE_UPDATE = 'CARE_PACKAGE_UPDATE',
  CARE_PACKAGE_DELETE = 'CARE_PACKAGE_DELETE',
  PATIENT_ASSIGNMENT_VIEW = 'PATIENT_ASSIGNMENT_VIEW',
  PATIENT_ASSIGNMENT_CREATE = 'PATIENT_ASSIGNMENT_CREATE',
  PATIENT_ASSIGNMENT_UPDATE = 'PATIENT_ASSIGNMENT_UPDATE',
  PATIENT_ASSIGNMENT_DELETE = 'PATIENT_ASSIGNMENT_DELETE',
  USER_VIEW = 'USER_VIEW',
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_PERMISSION_ASSIGN = 'USER_PERMISSION_ASSIGN',
  NOTIFICATION_VIEW = 'NOTIFICATION_VIEW',
  NOTIFICATION_CREATE = 'NOTIFICATION_CREATE',
  NOTIFICATION_UPDATE = 'NOTIFICATION_UPDATE',
  NOTIFICATION_DELETE = 'NOTIFICATION_DELETE',
  CARE_REQUEST_VIEW = 'CARE_REQUEST_VIEW',
  CARE_REQUEST_CREATE = 'CARE_REQUEST_CREATE',
  CARE_REQUEST_UPDATE = 'CARE_REQUEST_UPDATE',
  CARE_REQUEST_DELETE = 'CARE_REQUEST_DELETE',
  CARE_REQUEST_HANDLE = 'CARE_REQUEST_HANDLE',
  CHAT_VIEW = 'CHAT_VIEW',
  CHAT_UPDATE = 'CHAT_UPDATE',
  CHAT_DELETE = 'CHAT_DELETE',
  FACILITY_VIEW = 'FACILITY_VIEW',
  FACILITY_CREATE = 'FACILITY_CREATE',
  FACILITY_UPDATE = 'FACILITY_UPDATE',
  FACILITY_DELETE = 'FACILITY_DELETE',
  HEALTH_PROFILE_VIEW = 'HEALTH_PROFILE_VIEW',
  HEALTH_PROFILE_CREATE = 'HEALTH_PROFILE_CREATE',
  HEALTH_PROFILE_UPDATE = 'HEALTH_PROFILE_UPDATE',
  HEALTH_PROFILE_DELETE = 'HEALTH_PROFILE_DELETE',
  PATIENT_VIEW = 'PATIENT_VIEW',
  PATIENT_CREATE = 'PATIENT_CREATE',
  PATIENT_UPDATE = 'PATIENT_UPDATE',
  PATIENT_DELETE = 'PATIENT_DELETE',
  APPOINTMENT_VIEW = 'APPOINTMENT_VIEW',
  APPOINTMENT_CREATE = 'APPOINTMENT_CREATE',
  APPOINTMENT_UPDATE = 'APPOINTMENT_UPDATE',
  APPOINTMENT_DELETE = 'APPOINTMENT_DELETE',
  SOS_VIEW = 'SOS_VIEW',
  SOS_CREATE = 'SOS_CREATE',
  SOS_UPDATE = 'SOS_UPDATE',
  SOS_DELETE = 'SOS_DELETE',
  ORDER_VIEW = 'ORDER_VIEW',
  ORDER_CREATE = 'ORDER_CREATE',
  ORDER_UPDATE = 'ORDER_UPDATE',
  ORDER_DELETE = 'ORDER_DELETE',
  RISK_ASSESSMENT_VIEW = 'RISK_ASSESSMENT_VIEW',
  RISK_ASSESSMENT_CREATE = 'RISK_ASSESSMENT_CREATE',
  RISK_ASSESSMENT_UPDATE = 'RISK_ASSESSMENT_UPDATE',
  RISK_ASSESSMENT_DELETE = 'RISK_ASSESSMENT_DELETE',
  OCR_RESULT_VIEW = 'OCR_RESULT_VIEW',
  OCR_RESULT_CREATE = 'OCR_RESULT_CREATE',
  OCR_RESULT_UPDATE = 'OCR_RESULT_UPDATE',
  OCR_RESULT_DELETE = 'OCR_RESULT_DELETE',
  EXAMINATION_VIEW = 'EXAMINATION_VIEW',
  EXAMINATION_CREATE = 'EXAMINATION_CREATE',
  EXAMINATION_UPDATE = 'EXAMINATION_UPDATE',
  EXAMINATION_DELETE = 'EXAMINATION_DELETE',
  PRESCRIPTION_VIEW = 'PRESCRIPTION_VIEW',
  PRESCRIPTION_CREATE = 'PRESCRIPTION_CREATE',
  PRESCRIPTION_UPDATE = 'PRESCRIPTION_UPDATE',
  PRESCRIPTION_DELETE = 'PRESCRIPTION_DELETE',
  REFERRAL_VIEW = 'REFERRAL_VIEW',
  REFERRAL_UPDATE = 'REFERRAL_UPDATE',
  REFERRAL_DELETE = 'REFERRAL_DELETE',
  LAB_ORDER_EXECUTION_VIEW = 'LAB_ORDER_EXECUTION_VIEW',
  LAB_ORDER_EXECUTION_CREATE = 'LAB_ORDER_EXECUTION_CREATE',
  LAB_ORDER_EXECUTION_UPDATE = 'LAB_ORDER_EXECUTION_UPDATE',
  LAB_ORDER_EXECUTION_DELETE = 'LAB_ORDER_EXECUTION_DELETE',
  TASK_VIEW = 'TASK_VIEW',
  TASK_CREATE = 'TASK_CREATE',
  TASK_UPDATE = 'TASK_UPDATE',
  TASK_DELETE = 'TASK_DELETE',
}

export enum PrescriptionStatus {
  ACTIVE = 'ACTIVE',
  NEARLY_EXPIRED = 'NEARLY_EXPIRED',
  EXPIRED = 'EXPIRED',
}

export enum ReminderFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum ScheduleLogStatus {
  TAKEN = 'TAKEN',
  SKIPPED = 'SKIPPED',
}

export enum TargetMetricStatus {
  STABLE = 'STABLE',
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT',
}

/**
 * Supported units for health metrics.
 */
export enum HealthMetricUnit {
  KG = 'kg',
  LBS = 'lbs',
  MMHG = 'mmHg',
  MMOL_L = 'mmol/L',
  MG_DL = 'mg/dL',
  PERCENT = '%',
  BPM = 'bpm',
  CELSIUS = '°C',
  FEET = 'ft',
  CM = 'cm',
  TIMES_PER_DAY = 'times/day',
  LITERS = 'L',
}

/**
 * Recurrence schedule pattern for conversation reminders.
 */
export enum ReminderRecurrence {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

/**
 * RSVP response status of a conversation participant to a reminder.
 */
export enum ReminderParticipantStatus {
  PENDING = 'PENDING',
  JOINED = 'JOINED',
  DECLINED = 'DECLINED',
}

/**
 * Enum representing clinical and paraclinical departments in a hospital.
 */
export enum HospitalDepartment {
  /** Emergency Department / Khoa Cấp cứu */
  EMERGENCY = 'EMERGENCY',
  /** Outpatient Department / Khoa Khám bệnh */
  OUTPATIENT = 'OUTPATIENT',
  /** General Internal Medicine / Khoa Nội tổng hợp */
  INTERNAL_MEDICINE = 'INTERNAL_MEDICINE',
  /** General Surgery / Khoa Ngoại tổng hợp */
  SURGERY = 'SURGERY',
  /** Pediatrics / Khoa Nhi */
  PEDIATRICS = 'PEDIATRICS',
  /** Obstetrics & Gynecology / Khoa Phụ sản */
  OBSTETRICS_GYNECOLOGY = 'OBSTETRICS_GYNECOLOGY',
  /** Intensive Care Unit / Khoa Hồi sức tích cực */
  ICU = 'ICU',
  /** Cardiology / Khoa Tim mạch */
  CARDIOLOGY = 'CARDIOLOGY',
  /** Dermatology / Khoa Da liễu */
  DERMATOLOGY = 'DERMATOLOGY',
  /** Oncology / Khoa Ung bướu */
  ONCOLOGY = 'ONCOLOGY',
  /** Neurology / Khoa Thần kinh */
  NEUROLOGY = 'NEUROLOGY',
  /** Gastroenterology / Khoa Tiêu hóa */
  GASTROENTEROLOGY = 'GASTROENTEROLOGY',
  /** Pulmonology / Khoa Hô hấp */
  PULMONOLOGY = 'PULMONOLOGY',
  /** Otorhinolaryngology / Khoa Tai Mũi Họng (ENT) */
  ENT = 'ENT',
  /** Odonto-Stomatology / Khoa Răng Hàm Mặt */
  ODONTO_STOMATOLOGY = 'ODONTO_STOMATOLOGY',
  /** Ophthalmology / Khoa Mắt */
  OPHTHALMOLOGY = 'OPHTHALMOLOGY',
  /** Infectious Diseases / Khoa Truyền nhiễm */
  INFECTIOUS_DISEASES = 'INFECTIOUS_DISEASES',
  /** Diagnostic Imaging / Khoa Chẩn đoán hình ảnh */
  RADIOLOGY = 'RADIOLOGY',
  /** Laboratory / Khoa Xét nghiệm */
  LABORATORY = 'LABORATORY',
  /** Pharmacy / Khoa Dược */
  PHARMACY = 'PHARMACY',
  /** Anesthesiology / Khoa Gây mê hồi sức */
  ANESTHESIOLOGY = 'ANESTHESIOLOGY',
  /** Rehabilitation / Khoa Phục hồi chức năng */
  REHABILITATION = 'REHABILITATION',
  /** Traditional Medicine / Khoa Y học cổ truyền */
  TRADITIONAL_MEDICINE = 'TRADITIONAL_MEDICINE',
  /** Nutrition / Khoa Dinh dưỡng */
  NUTRITION = 'NUTRITION',
}

export enum PatientHealthProfileAccessRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
}

export enum PatientHealthProfileOwnershipType {
  SELF = 'SELF',
  FAMILY = 'FAMILY',
  SHARED = 'SHARED',
}

