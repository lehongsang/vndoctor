# 09. Module Risk Assessments (Phân tầng Nguy cơ Tim mạch & Red Flags)

## 📌 Tổng quan
Module `risk-assessments` xử lý:
1. Đánh giá phân tầng nguy cơ tim mạch 10 năm theo mô hình **SCORE2 / ASCVD** với 3 cấp độ: `LOW`, `HIGH`, `VERY_HIGH`.
2. Hệ thống cảnh báo tự động **Red Flags** (Báo động đỏ) cho UI App hiển thị làm nổi bật các chỉ số nguy hiểm (Huyết áp $\ge 140/90$, hút thuốc lá, béo phì, tổn thương cơ quan đích).
3. Luồng Bác sĩ chuyên khoa kết luận & tư vấn (`/evaluate`).

---

## 🚀 Danh sách API

### 1. Tạo Phiếu Đánh giá Nguy cơ (App / Doctor)
- **Method**: `POST`
- **Path**: `/risk-assessments`
- **Quyền**: `AppAuthGuard` hoặc `StaffAuthGuard`

#### 📥 Input (Body - `CreateRiskAssessmentDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `healthProfileId` | UUID | Có | ID hồ sơ sức khỏe |
| `facilityId` | UUID | Không | ID cơ sở y tế |
| `systolicBp` | number | Không | Huyết áp tâm thu (mmHg) |
| `diastolicBp` | number | Không | Huyết áp tâm trương (mmHg) |
| `heightCm` | number | Không | Chiều cao (cm) |
| `weightKg` | number | Không | Cân nặng (kg) |
| `isSmoking` | boolean | Không | Có đang hút thuốc không |
| `totalCholesterol`| number | Không | Mỡ máu toàn phần (mmol/L) |
| `glucoseFasting` | number | Không | Đường huyết đói (mmol/L) |
| `hasRetinopathy` | boolean | Không | Tổn thương võng mạc |
| `hasLeftVentricularHypertrophy` | boolean | Không | Phì đại thất trái |
| `hasAlbuminuria` | boolean | Không | Đạm niệu |
| `hasSilentBrainInfarct` | boolean | Không | Nhồi máu não im lặng |
| `egfr` | number | Không | Độ lọc cầu thận (mL/min/1.73m2) |

*Ví dụ Body:*
```json
{
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "heightCm": 170.0,
  "weightKg": 75.0,
  "systolicBp": 165,
  "diastolicBp": 95,
  "isSmoking": true,
  "totalCholesterol": 5.8,
  "glucoseFasting": 6.2
}
```

#### 📤 Output (201 Created)
```json
{
  "id": "b1248011-89d2-43e1-bc6e-3402e118c777",
  "assessmentInputId": "e3a89045-3ef1-4ad9-bf9d-2101e405a111",
  "riskLevel": "HIGH",
  "riskScore": 8.0,
  "doctorId": null,
  "doctor": null,
  "conclusion": null,
  "recommendations": null,
  "evaluatedAt": "2026-09-08T07:30:00.000Z",
  "hasWarningAlert": true,
  "redFlags": [
    {
      "metric": "BLOOD_PRESSURE",
      "level": "DANGER",
      "title": "Huyết áp tăng cao (Tăng huyết áp độ 2/3)",
      "value": "165/95 mmHg"
    },
    {
      "metric": "SMOKING",
      "level": "DANGER",
      "title": "Hút thuốc lá làm tăng gấp đôi nguy cơ biến cố tim mạch",
      "value": "Đang hút thuốc"
    },
    {
      "metric": "BMI_OBESITY",
      "level": "WARNING",
      "title": "Chỉ số khối cơ thể (BMI) ở mức thừa cân / béo phì",
      "value": "BMI: 25.95"
    },
    {
      "metric": "LIPID_CHOLESTEROL",
      "level": "WARNING",
      "title": "Mỡ máu (Total Cholesterol) tăng cao",
      "value": "5.8 mmol/L"
    }
  ]
}
```

---

### 2. Bác sĩ Đánh giá & Kết luận Chuyên khoa
- **Method**: `POST`
- **Path**: `/risk-assessments/:id/evaluate`
- **Quyền**: `StaffAuthGuard` (`DOCTOR`, `ADMIN`)

#### 📥 Input (Body - `EvaluateRiskAssessmentDto`)
```json
{
  "riskLevel": "VERY_HIGH",
  "riskScore": 12.5,
  "conclusion": "Bệnh nhân có nguy cơ tim mạch rất cao do kết hợp THA độ 2, hút thuốc lá và tăng cholesterol.",
  "recommendations": "Khởi động điều trị phối hợp 2 nhóm thuốc hạ áp, statin liều trung bình và cai thuốc lá."
}
```

#### 📤 Output (200 OK)
Trả về đối tượng kết quả phân tầng đầy đủ thông tin bác sĩ, kết luận và cảnh báo red flags.
