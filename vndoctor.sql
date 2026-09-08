CREATE TABLE `facilities` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `facility_code` varchar(50) UNIQUE NOT NULL,
  `facility_name` varchar(255) NOT NULL,
  `phone_number` varchar(20),
  `address` text NOT NULL,
  `is_active` boolean DEFAULT true,
  `created_at` timestamptz DEFAULT (now()),
  `updated_at` timestamptz DEFAULT (now())
);

CREATE TABLE `users` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `facility_id` uuid NOT NULL COMMENT 'Thuộc cơ sở y tế',
  `staff_code` varchar(50) UNIQUE NOT NULL COMMENT 'Mã nhân viên / CCHN',
  `username` varchar(50) UNIQUE NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `role` ENUM ('ADMIN', 'DOCTOR', 'NURSE', 'TECHNICIAN', 'STAFF') NOT NULL DEFAULT 'STAFF',
  `specialty` varchar(100) COMMENT 'Chuyên khoa',
  `email` varchar(255) UNIQUE,
  `phone_number` varchar(20),
  `is_active` boolean DEFAULT true,
  `created_at` timestamptz DEFAULT (now()),
  `updated_at` timestamptz DEFAULT (now())
);

CREATE TABLE `accounts` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `phone_number` varchar(20) UNIQUE NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `email` varchar(255),
  `is_active` boolean DEFAULT true,
  `created_at` timestamptz DEFAULT (now()),
  `updated_at` timestamptz DEFAULT (now())
);

CREATE TABLE `health_profiles` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `account_id` uuid NOT NULL COMMENT 'Tài khoản app sở hữu hồ sơ',
  `relationship` ENUM ('SELF', 'FATHER', 'MOTHER', 'CHILD', 'SPOUSE', 'OTHER') NOT NULL DEFAULT 'SELF',
  `full_name` varchar(255) NOT NULL,
  `dob` date NOT NULL,
  `gender` ENUM ('MALE', 'FEMALE', 'OTHER') NOT NULL,
  `citizen_id` varchar(12) COMMENT 'CCCD 12 số',
  `phone_number` varchar(20),
  `address` text,
  `blood_type` ENUM ('A', 'B', 'AB', 'O', 'UNKNOWN') DEFAULT 'UNKNOWN',
  `allergy` text COMMENT 'Dị ứng thuốc, thực phẩm,...',
  `medical_history` text COMMENT 'Tiền sử bệnh lý gia đình & cá nhân khác',
  `created_at` timestamptz DEFAULT (now()),
  `updated_at` timestamptz DEFAULT (now())
);

CREATE TABLE `facility_patient_links` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `facility_id` uuid NOT NULL COMMENT 'Cơ sở y tế trên Web CMS',
  `health_profile_id` uuid NOT NULL COMMENT 'Hồ sơ sức khỏe của bệnh nhân trên App',
  `phone_number` varchar(20) NOT NULL COMMENT 'SĐT dùng để tìm kiếm và liên kết',
  `hospital_patient_code` varchar(50) COMMENT 'Mã bệnh nhân / Mã hồ sơ do viện cấp (nếu có)',
  `status` ENUM ('PENDING', 'ACTIVE', 'UNLINKED') DEFAULT 'ACTIVE',
  `linked_at` timestamptz DEFAULT (now()) COMMENT 'Thời điểm liên kết thành công',
  `created_at` timestamptz DEFAULT (now()),
  `updated_at` timestamptz DEFAULT (now())
);

CREATE TABLE `chronic_diseases` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `code` varchar(50) UNIQUE NOT NULL COMMENT 'Mã: DIABETES, STROKE, CAD,...',
  `name` varchar(255) NOT NULL COMMENT 'Tên bệnh',
  `icd10_code` varchar(20) COMMENT 'Mã ICD-10',
  `category` varchar(100) COMMENT 'Tim mạch, Chuyển hóa,...',
  `is_active` boolean DEFAULT true,
  `display_order` int DEFAULT 0,
  `created_at` timestamptz DEFAULT (now())
);

CREATE TABLE `profile_chronic_diseases` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `health_profile_id` uuid UNIQUE NOT NULL COMMENT 'Mỗi hồ sơ có đúng 1 dòng',
  `disease_ids` uuid[] COMMENT 'Mảng ID các bệnh mạn tính: [uuid1, uuid2,...]',
  `updated_at` timestamptz DEFAULT (now())
);

CREATE TABLE `risk_factor_assessment_inputs` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `health_profile_id` uuid NOT NULL COMMENT 'Hồ sơ người được đánh giá',
  `facility_id` uuid COMMENT 'Cơ sở y tế (nếu có)',
  `has_underlying_disease` boolean DEFAULT false,
  `chronic_disease_ids` uuid[] DEFAULT ('{}'),
  `has_left_ventricular_hypertrophy` boolean DEFAULT false,
  `has_albuminuria` boolean DEFAULT false,
  `has_retinopathy` boolean DEFAULT false,
  `has_silent_brain_infarct` boolean DEFAULT false,
  `egfr` decimal(5,2),
  `acr` decimal(7,2),
  `height_cm` decimal(5,2),
  `weight_kg` decimal(5,2),
  `bmi` decimal(4,2),
  `systolic_bp` int,
  `diastolic_bp` int,
  `is_smoking` boolean DEFAULT false,
  `total_cholesterol` decimal(5,2),
  `hdl_cholesterol` decimal(5,2),
  `ldl_cholesterol` decimal(5,2),
  `triglycerides` decimal(5,2),
  `glucose_fasting` decimal(5,2),
  `status` ENUM ('DRAFT', 'SUBMITTED', 'EVALUATED', 'CANCELLED') DEFAULT 'SUBMITTED',
  `assessment_date` timestamptz DEFAULT (now()),
  `created_at` timestamptz DEFAULT (now()),
  `updated_at` timestamptz DEFAULT (now())
);

CREATE TABLE `risk_factor_assessment_results` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `assessment_input_id` uuid UNIQUE NOT NULL COMMENT 'Khóa ngoại 1-1 trỏ về bảng Input',
  `doctor_id` uuid COMMENT 'Bác sĩ duyệt / tư vấn kết luận (nếu có)',
  `risk_score` decimal(5,2) COMMENT 'Điểm % nguy cơ tim mạch 10 năm (SCORE/ASCVD)',
  `risk_level` ENUM ('LOW', 'MODERATE', 'HIGH', 'VERY_HIGH') COMMENT 'Mức độ nguy cơ',
  `conclusion` text,
  `recommendations` text,
  `evaluated_at` timestamptz DEFAULT (now()),
  `created_at` timestamptz DEFAULT (now()),
  `updated_at` timestamptz DEFAULT (now())
);

CREATE TABLE `examinations` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `examination_code` varchar(50) UNIQUE NOT NULL COMMENT 'Mã phiếu khám (EX-2026-xxx)',
  `health_profile_id` uuid NOT NULL COMMENT 'Hồ sơ bệnh nhân được khám',
  `doctor_id` uuid NOT NULL COMMENT 'Bác sĩ trực tiếp khám (users.id)',
  `facility_id` uuid NOT NULL COMMENT 'Cơ sở y tế thực hiện',
  `assessment_input_id` uuid COMMENT 'Liên kết tới phiếu PTYTNC (nếu có)',
  `heart_rate` int,
  `systolic_bp` int,
  `diastolic_bp` int,
  `temperature` decimal(4,1),
  `spo2` int,
  `height_cm` decimal(5,2),
  `weight_kg` decimal(5,2),
  `bmi` decimal(4,2),
  `reason_for_visit` text,
  `clinical_symptoms` text,
  `diagnosis` text NOT NULL,
  `icd10_code` varchar(20),
  `treatment_plan` text,
  `next_appointment_date` date,
  `status` ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'IN_PROGRESS',
  `examination_date` timestamptz DEFAULT (now()),
  `created_at` timestamptz DEFAULT (now()),
  `updated_at` timestamptz DEFAULT (now())
);

CREATE TABLE `health_records` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `health_profile_id` uuid NOT NULL COMMENT 'Hồ sơ người được đo',
  `metric_type` ENUM ('BLOOD_PRESSURE', 'HEART_RATE', 'BLOOD_GLUCOSE', 'SPO2', 'BODY_TEMPERATURE', 'WEIGHT') NOT NULL COMMENT 'Loại chỉ số đo theo Enum',
  `value_numeric` decimal(8,2) NOT NULL COMMENT 'Giá trị chính (HA tâm thu, Nhịp tim, Đường huyết,...)',
  `secondary_value` decimal(8,2) COMMENT 'Giá trị phụ (HA tâm trương khi đo Huyết áp)',
  `unit` varchar(20) NOT NULL COMMENT 'Đơn vị: mmHg, bpm, mmol/L, kg, %, °C,...',
  `note` text COMMENT 'Ghi chú thêm của người đo',
  `measured_at` timestamptz NOT NULL DEFAULT (now()) COMMENT 'Thời điểm thực hiện đo',
  `created_at` timestamptz DEFAULT (now())
);

CREATE TABLE `treatment_target_dictionaries` (
  `code` varchar(20) PRIMARY KEY COMMENT 'Mã định danh từ điển (A1 -> G5)',
  `assessment_notes` text,
  `assessment_timeframe` text,
  `bp_target` varchar(255),
  `lipid_target` varchar(255),
  `bmi_target` varchar(255),
  `glycemic_target` varchar(255),
  `renal_target` varchar(255),
  `diet_advice` text,
  `exercise_advice` text,
  `smoking_advice` text,
  `notes` text,
  `created_at` timestamptz DEFAULT (now())
);

CREATE TABLE `patient_treatment_targets` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `health_profile_id` uuid NOT NULL COMMENT 'Hồ sơ bệnh nhân sở hữu mục tiêu',
  `doctor_id` uuid COMMENT 'Bác sĩ duyệt/chỉnh sửa mục tiêu',
  `examination_id` uuid COMMENT 'Liên kết tới buổi khám (nếu có)',
  `assessment_result_id` uuid COMMENT 'Liên kết tới kết quả PTYTNC (nếu có)',
  `dictionary_code` varchar(20) COMMENT 'Mã từ điển tham chiếu',
  `bp_target` varchar(255),
  `lipid_target` varchar(255),
  `bmi_target` varchar(255),
  `glycemic_target` varchar(255),
  `diet_advice` text,
  `exercise_advice` text,
  `doctor_notes` text,
  `status` ENUM ('DRAFT', 'DOCTOR_VERIFIED', 'COMPLETED', 'CANCELLED') DEFAULT 'DRAFT',
  `verified_at` timestamptz,
  `created_at` timestamptz DEFAULT (now()),
  `updated_at` timestamptz DEFAULT (now())
);

CREATE TABLE `treatment_plans` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `plan_code` varchar(50) UNIQUE NOT NULL COMMENT 'Mã phác đồ (TP-2026-xxx)',
  `health_profile_id` uuid NOT NULL COMMENT 'Bệnh nhân áp dụng phác đồ',
  `doctor_id` uuid NOT NULL COMMENT 'Bác sĩ phụ trách phác đồ',
  `treatment_target_id` uuid COMMENT 'Gắn liền với mục tiêu điều trị nào',
  `title` varchar(255) NOT NULL,
  `start_date` date NOT NULL DEFAULT (now()),
  `end_date` date,
  `doctor_notes` text,
  `status` ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'DISCONTINUED') DEFAULT 'ACTIVE',
  `created_at` timestamptz DEFAULT (now()),
  `updated_at` timestamptz DEFAULT (now())
);

CREATE TABLE `treatment_templates` (
  `id` uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  `facility_id` uuid NOT NULL COMMENT 'Thuộc cơ sở y tế nào',
  `template_name` varchar(255) NOT NULL,
  `disease_category` varchar(100),
  `content` text NOT NULL,
  `is_active` boolean DEFAULT true,
  `created_at` timestamptz DEFAULT (now()),
  `updated_at` timestamptz DEFAULT (now())
);

CREATE INDEX `users_index_0` ON `users` (`facility_id`);

CREATE INDEX `users_index_1` ON `users` (`role`);

CREATE INDEX `users_index_2` ON `users` (`is_active`);

CREATE INDEX `health_profiles_index_3` ON `health_profiles` (`account_id`, `relationship`);

CREATE INDEX `health_profiles_index_4` ON `health_profiles` (`citizen_id`);

CREATE INDEX `health_profiles_index_5` ON `health_profiles` (`full_name`);

CREATE UNIQUE INDEX `facility_patient_links_index_6` ON `facility_patient_links` (`facility_id`, `health_profile_id`);

CREATE INDEX `facility_patient_links_index_7` ON `facility_patient_links` (`facility_id`, `phone_number`);

CREATE INDEX `facility_patient_links_index_8` ON `facility_patient_links` (`phone_number`);

CREATE INDEX `facility_patient_links_index_9` ON `facility_patient_links` (`hospital_patient_code`);

CREATE INDEX `risk_factor_assessment_inputs_index_10` ON `risk_factor_assessment_inputs` (`health_profile_id`, `assessment_date`);

CREATE INDEX `risk_factor_assessment_inputs_index_11` ON `risk_factor_assessment_inputs` (`facility_id`);

CREATE INDEX `risk_factor_assessment_inputs_index_12` ON `risk_factor_assessment_inputs` (`status`);

CREATE INDEX `risk_factor_assessment_results_index_13` ON `risk_factor_assessment_results` (`doctor_id`);

CREATE INDEX `risk_factor_assessment_results_index_14` ON `risk_factor_assessment_results` (`risk_level`);

CREATE INDEX `risk_factor_assessment_results_index_15` ON `risk_factor_assessment_results` (`evaluated_at`);

CREATE INDEX `examinations_index_16` ON `examinations` (`health_profile_id`, `examination_date`);

CREATE INDEX `examinations_index_17` ON `examinations` (`doctor_id`);

CREATE INDEX `examinations_index_18` ON `examinations` (`facility_id`);

CREATE INDEX `examinations_index_19` ON `examinations` (`status`);

CREATE INDEX `examinations_index_20` ON `examinations` (`examination_code`);

CREATE INDEX `health_records_index_21` ON `health_records` (`health_profile_id`, `metric_type`, `measured_at`);

CREATE INDEX `health_records_index_22` ON `health_records` (`measured_at`);

CREATE INDEX `patient_treatment_targets_index_23` ON `patient_treatment_targets` (`health_profile_id`, `status`);

CREATE INDEX `patient_treatment_targets_index_24` ON `patient_treatment_targets` (`doctor_id`);

CREATE INDEX `patient_treatment_targets_index_25` ON `patient_treatment_targets` (`examination_id`);

CREATE INDEX `patient_treatment_targets_index_26` ON `patient_treatment_targets` (`assessment_result_id`);

CREATE INDEX `treatment_plans_index_27` ON `treatment_plans` (`health_profile_id`, `status`);

CREATE INDEX `treatment_plans_index_28` ON `treatment_plans` (`doctor_id`);

CREATE INDEX `treatment_plans_index_29` ON `treatment_plans` (`plan_code`);

CREATE INDEX `treatment_templates_index_30` ON `treatment_templates` (`facility_id`);

CREATE INDEX `treatment_templates_index_31` ON `treatment_templates` (`disease_category`);

ALTER TABLE `users` ADD FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`id`) ON DELETE RESTRICT;

ALTER TABLE `health_profiles` ADD FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT;

ALTER TABLE `health_profiles` ADD FOREIGN KEY (`id`) REFERENCES `profile_chronic_diseases` (`health_profile_id`) ON DELETE CASCADE;

ALTER TABLE `facility_patient_links` ADD FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`id`) ON DELETE RESTRICT;

ALTER TABLE `facility_patient_links` ADD FOREIGN KEY (`health_profile_id`) REFERENCES `health_profiles` (`id`) ON DELETE CASCADE;

ALTER TABLE `risk_factor_assessment_inputs` ADD FOREIGN KEY (`health_profile_id`) REFERENCES `health_profiles` (`id`) ON DELETE RESTRICT;

ALTER TABLE `risk_factor_assessment_inputs` ADD FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`id`) ON DELETE SET NULL;

ALTER TABLE `risk_factor_assessment_inputs` ADD FOREIGN KEY (`id`) REFERENCES `risk_factor_assessment_results` (`assessment_input_id`) ON DELETE CASCADE;

ALTER TABLE `risk_factor_assessment_results` ADD FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

ALTER TABLE `examinations` ADD FOREIGN KEY (`health_profile_id`) REFERENCES `health_profiles` (`id`) ON DELETE RESTRICT;

ALTER TABLE `examinations` ADD FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

ALTER TABLE `examinations` ADD FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`id`) ON DELETE RESTRICT;

ALTER TABLE `examinations` ADD FOREIGN KEY (`assessment_input_id`) REFERENCES `risk_factor_assessment_inputs` (`id`) ON DELETE SET NULL;

ALTER TABLE `health_records` ADD FOREIGN KEY (`health_profile_id`) REFERENCES `health_profiles` (`id`) ON DELETE CASCADE;

ALTER TABLE `patient_treatment_targets` ADD FOREIGN KEY (`health_profile_id`) REFERENCES `health_profiles` (`id`) ON DELETE RESTRICT;

ALTER TABLE `patient_treatment_targets` ADD FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

ALTER TABLE `patient_treatment_targets` ADD FOREIGN KEY (`examination_id`) REFERENCES `examinations` (`id`) ON DELETE SET NULL;

ALTER TABLE `patient_treatment_targets` ADD FOREIGN KEY (`assessment_result_id`) REFERENCES `risk_factor_assessment_results` (`id`) ON DELETE SET NULL;

ALTER TABLE `patient_treatment_targets` ADD FOREIGN KEY (`dictionary_code`) REFERENCES `treatment_target_dictionaries` (`code`) ON DELETE SET NULL;

ALTER TABLE `treatment_plans` ADD FOREIGN KEY (`health_profile_id`) REFERENCES `health_profiles` (`id`) ON DELETE RESTRICT;

ALTER TABLE `treatment_plans` ADD FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

ALTER TABLE `treatment_plans` ADD FOREIGN KEY (`treatment_target_id`) REFERENCES `patient_treatment_targets` (`id`) ON DELETE SET NULL;

ALTER TABLE `treatment_templates` ADD FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`id`) ON DELETE CASCADE;
