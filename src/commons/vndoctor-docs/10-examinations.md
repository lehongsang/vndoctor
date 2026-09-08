# 10. Module Examinations (Khám Bệnh Lâm Sàng)

## 📌 Tổng quan
Module `examinations` quản lý phiếu khám bệnh trực tiếp tại cơ sở y tế với mã phiếu khám tự động `EX-YYYY-XXXXX`. Bác sĩ ghi nhận chỉ số sinh hiệu, lý do khám, chẩn đoán, mã ICD-10, kế hoạch điều trị và lịch hẹn tái khám.

---

## 🚀 Danh sách API

### 1. Lập Phiếu Khám Bệnh mới (Doctor)
- **Method**: `POST`
- **Path**: `/examinations`
- **Quyền**: `StaffAuthGuard` (`DOCTOR`, `ADMIN`)

#### 📥 Input (Body - `CreateExaminationDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `healthProfileId` | UUID | Có | ID hồ sơ bệnh nhân |
| `heartRate` | number | Không | Nhịp tim (bpm) |
| `systolicBp` | number | Không | Huyết áp tâm thu |
| `diastolicBp` | number | Không | Huyết áp tâm trương |
| `temperature` | number | Không | Thân nhiệt (°C) |
| `spo2` | number | Không | SpO2 (%) |
| `heightCm` | number | Không | Chiều cao (cm) |
| `weightKg` | number | Không | Cân nặng (kg) |
| `reasonForVisit` | string | Không | Lý do đến khám |
| `clinicalSymptoms` | string | Không | Triệu chứng lâm sàng |
| `diagnosis` | string | Có | Chẩn đoán của Bác sĩ |
| `icd10Code` | string | Không | Mã bệnh ICD-10 |
| `treatmentPlan` | string | Không | Kế hoạch điều trị / Toa thuốc |
| `nextAppointmentDate`| string | Không | Ngày hẹn tái khám (YYYY-MM-DD) |
| `status` | enum | Không | `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |

*Ví dụ Body:*
```json
{
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "heartRate": 78,
  "systolicBp": 135,
  "diastolicBp": 85,
  "temperature": 36.8,
  "spo2": 98,
  "heightCm": 170.0,
  "weightKg": 72.0,
  "reasonForVisit": "Tái khám huyết áp định kỳ",
  "clinicalSymptoms": "Không đau ngực, không khó thở",
  "diagnosis": "Tăng huyết áp nguyên phát độ 1 - Rối loạn lipid máu",
  "icd10Code": "I10",
  "treatmentPlan": "Amlodipine 5mg x 01 viên/ngày, Atorvastatin 10mg x 01 viên/tối",
  "nextAppointmentDate": "2026-10-08",
  "status": "COMPLETED"
}
```

#### 📤 Output (201 Created)
```json
{
  "id": "ex-uuid-1",
  "examinationCode": "EX-2026-00001",
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "doctorId": "doctor-staff-uuid",
  "facilityId": "facility-uuid",
  "diagnosis": "Tăng huyết áp nguyên phát độ 1 - Rối loạn lipid máu",
  "status": "COMPLETED",
  "examinationDate": "2026-09-08T08:00:00.000Z"
}
```

---

### 2. Bệnh nhân xem lịch sử khám bệnh (App)
- **Method**: `GET`
- **Path**: `/examinations/my-records`
- **Quyền**: `AppAuthGuard`

---

### 3. Xem chi tiết Phiếu khám
- **Method**: `GET`
- **Path**: `/examinations/:id`
- **Quyền**: `StaffAuthGuard`
