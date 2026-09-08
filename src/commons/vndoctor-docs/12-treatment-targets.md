# 12. Module Treatment Targets (Mục tiêu Điều trị Cá nhân hóa)

## 📌 Tổng quan
Module `treatment-targets` quản lý các mục tiêu điều trị cụ thể của bệnh nhân (`patient_treatment_targets`). Mục tiêu có thể được khởi tạo tham chiếu từ bộ từ điển chuẩn A1-G5 và được Bác sĩ chuyên khoa xác nhận phê duyệt:
- `DRAFT`: Mục tiêu nháp (do bệnh nhân tạo hoặc khởi tạo ban đầu)
- `DOCTOR_VERIFIED`: Đã được Bác sĩ kiểm tra, điều chỉnh và xác nhận
- `COMPLETED`: Đã đạt mục tiêu điều trị
- `CANCELLED`: Hủy bỏ

---

## 🚀 Danh sách API

### 1. Bác sĩ Thiết lập Mục tiêu Điều trị cho Bệnh nhân
- **Method**: `POST`
- **Path**: `/treatment-targets`
- **Quyền**: `StaffAuthGuard` (`DOCTOR`, `ADMIN`)

#### 📥 Input (Body - `CreatePatientTargetDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `healthProfileId` | UUID | Có | ID hồ sơ sức khỏe |
| `dictionaryCode` | string | Không | Mã từ điển tham chiếu (VD: `B1`) |
| `examinationId` | UUID | Không | ID buổi khám liên kết |
| `assessmentResultId` | UUID | Không | ID kết quả phân tầng nguy cơ |
| `bpTarget` | string | Không | Mục tiêu huyết áp (VD: `< 130/80 mmHg`) |
| `lipidTarget` | string | Không | Mục tiêu mỡ máu LDL-C (VD: `< 1.8 mmol/L`) |
| `bmiTarget` | string | Không | Mục tiêu BMI (VD: `20 - 22.9`) |
| `glycemicTarget` | string | Không | Mục tiêu HbA1c / Đường huyết |
| `dietAdvice` | string | Không | Chế độ ăn uống |
| `exerciseAdvice` | string | Không | Chế độ vận động |
| `doctorNotes` | string | Không | Ghi chú dặn dò của bác sĩ |

*Ví dụ Body:*
```json
{
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "dictionaryCode": "B1",
  "bpTarget": "< 130/80 mmHg",
  "lipidTarget": "LDL-C < 1.8 mmol/L",
  "bmiTarget": "BMI 20 - 22.9",
  "glycemicTarget": "HbA1c < 7.0%",
  "doctorNotes": "Cần kiểm soát chặt chẽ huyết áp buổi sáng"
}
```

#### 📤 Output (201 Created)
```json
{
  "id": "target-uuid-1",
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "doctorId": "doctor-staff-uuid",
  "dictionaryCode": "B1",
  "bpTarget": "< 130/80 mmHg",
  "lipidTarget": "LDL-C < 1.8 mmol/L",
  "bmiTarget": "BMI 20 - 22.9",
  "glycemicTarget": "HbA1c < 7.0%",
  "status": "DOCTOR_VERIFIED",
  "verifiedAt": "2026-09-08T08:30:00.000Z",
  "createdAt": "2026-09-08T08:30:00.000Z"
}
```

---

### 2. Bác sĩ Phê duyệt & Điều chỉnh Mục tiêu
- **Method**: `POST`
- **Path**: `/treatment-targets/:id/verify`
- **Quyền**: `StaffAuthGuard` (`DOCTOR`, `ADMIN`)

#### 📥 Input (Body - `VerifyPatientTargetDto`)
```json
{
  "bpTarget": "< 125/75 mmHg",
  "doctorNotes": "Đã duyệt mục tiêu sau khi thăm khám trực tiếp"
}
```

---

### 3. Bệnh nhân tự tạo Mục tiêu Nháp (App)
- **Method**: `POST`
- **Path**: `/treatment-targets/self`
- **Quyền**: `AppAuthGuard`

---

### 4. Bệnh nhân xem Mục tiêu của mình (App)
- **Method**: `GET`
- **Path**: `/treatment-targets/my-targets`
- **Quyền**: `AppAuthGuard`
