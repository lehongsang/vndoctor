# 09. Module Risk Assessments (Phân tầng Nguy cơ Tim mạch & Red Flags)

## 📌 Tổng quan
Module `risk-assessments` xử lý:
1. **Dynamic Form Schema (`/form-schema`)**: Trả về cấu trúc 3 khối trường (`GENERAL_METRICS`, `TARGET_ORGAN_DAMAGE`, `CHRONIC_DISEASES`), tự động điền tuổi, giới tính và khóa (`disabled: true`) các trường bệnh nền đã có sẵn trong hồ sơ sức khỏe.
2. **Đánh giá phân tầng nguy cơ 10 năm**: Theo mô hình **SCORE2 / ASCVD & Non-ASCVD** với 3 cấp độ: `LOW` (Thấp), `HIGH` (Cao), `VERY_HIGH` (Rất cao).
3. **Cảnh báo tự động Red Flags**: Tự động phát hiện các chỉ số vượt ngưỡng nguy hiểm (Huyết áp $\ge 140/90$, hút thuốc, béo phì, tổn thương cơ quan đích, eGFR thấp...) để UI FE làm nổi bật.
4. **Bác sĩ thẩm định & kết luận chuyên khoa (`/evaluate`)**: Bác sĩ xác nhận/điều chỉnh điểm số, phân tầng nguy cơ, ghi chẩn đoán và khuyến nghị phác đồ điều trị.

---

## 🚀 Danh sách Endpoints cho FE

| Endpoint | Method | Quyền (Auth) | Mô tả |
| :--- | :--- | :--- | :--- |
| `/risk-assessments/form-schema` | `GET` | `AppAuth` / `StaffAuth` | Lấy Schema form động phân tầng nguy cơ (Auto-fill & Khóa trường) |
| `/risk-assessments` | `POST` | `AppAuth` / `StaffAuth` | Bệnh nhân hoặc Bác sĩ/Staff gửi dữ liệu tính toán phân tầng nguy cơ |
| `/risk-assessments` | `GET` | `AppAuth` | Danh sách lịch sử đánh giá của bệnh nhân đang đăng nhập |
| `/risk-assessments/staff` | `GET` | `StaffAuth` | Danh sách phiếu đánh giá tại cơ sở y tế (Bác sĩ/Quản lý tra cứu) |
| `/risk-assessments/:id` | `GET` | `AppAuth` / `StaffAuth` | Xem chi tiết phiếu đánh giá kèm Red Flags & Kết luận bác sĩ |
| `/risk-assessments/:id/evaluate` | `POST` | `StaffAuth` (`DOCTOR`, `ADMIN`) | Bác sĩ thẩm định, xác nhận phân tầng & ghi kết luận phác đồ |
| `/risk-assessments/:id` | `DELETE` | `AppAuth` / `StaffAuth` | Xóa mềm phiếu đánh giá nguy cơ |

---

## 📋 Chi tiết từng API

### 1. Lấy Dynamic Form Schema (Auto-fill & Lock)
- **Method**: `GET`
- **Path**: `/risk-assessments/form-schema?healthProfileId={profileId}`
- **Quyền**: Bearer Token (`AppAuth` hoặc `StaffAuth`)

#### 📥 Query Params
- `healthProfileId` (UUID, Bắt buộc): ID hồ sơ sức khỏe của bệnh nhân cần đánh giá.

#### 📤 Output mẫu (200 OK)
```json
{
  "formCode": "RISK_FACTOR_STRATIFICATION",
  "title": "Phiếu Đánh Giá Yếu Tố Nguy Cơ Tim Mạch & Bệnh Chuyển Hóa",
  "patientProfile": {
    "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "calculatedAge": 52,
    "gender": "Nam",
    "hasRecordedUnderlyingDiseases": true,
    "recordedDiseaseCodes": ["DIABETES", "HYPERTENSION"]
  },
  "sections": [
    {
      "code": "GENERAL_METRICS",
      "title": "1. Thông tin Nhân khẩu & Chỉ số Sinh lý (SCORE2)",
      "fields": [
        { "name": "age", "label": "Tuổi", "type": "NUMBER", "value": 52, "disabled": true },
        { "name": "gender", "label": "Giới tính", "type": "SELECT", "value": "Nam", "disabled": true },
        { "name": "isSmoking", "label": "Hút thuốc lá", "type": "BOOLEAN", "value": false },
        { "name": "systolicBp", "label": "Huyết áp tâm thu (mmHg)", "type": "NUMBER" },
        { "name": "diastolicBp", "label": "Huyết áp tâm trương (mmHg)", "type": "NUMBER" },
        { "name": "totalCholesterol", "label": "Cholesterol toàn phần (mmol/L)", "type": "NUMBER" }
      ]
    },
    {
      "code": "TARGET_ORGAN_DAMAGE",
      "title": "2. Tổn thương Cơ quan Đích",
      "fields": [
        { "name": "hasLeftVentricularHypertrophy", "label": "Phì đại thất trái", "type": "BOOLEAN" },
        { "name": "hasAlbuminuria", "label": "Đạm niệu / Microalbumin niệu", "type": "BOOLEAN" },
        { "name": "hasRetinopathy", "label": "Tổn thương võng mạc do THA", "type": "BOOLEAN" },
        { "name": "hasSilentBrainInfarct", "label": "Nhồi máu não thầm lặng", "type": "BOOLEAN" }
      ]
    },
    {
      "code": "CHRONIC_DISEASES",
      "title": "3. Bệnh lý Mạn tính & Biến cố Tim mạch Đã mắc",
      "fields": [
        { "name": "diabetes", "label": "Đái tháo đường", "type": "BOOLEAN", "value": true, "disabled": true },
        { "name": "stroke", "label": "Tiền sử đột quỵ / Tai biến", "type": "BOOLEAN" },
        { "name": "hasMyocardialInfarction", "label": "Nhồi máu cơ tim", "type": "BOOLEAN" }
      ]
    }
  ]
}
```

---

### 2. Tạo Phiếu Đánh Giá Nguy Cơ
- **Method**: `POST`
- **Path**: `/risk-assessments`
- **Quyền**: Bearer Token (`AppAuth` hoặc `StaffAuth`)
- **Nguyên tắc hoạt động**: Backend phân loại tự động thành **2 LUỒNG ĐÁNH GIÁ** dựa vào trường `hasUnderlyingDisease`:
  - `hasUnderlyingDisease = false`: **Luồng 1 (Không có bệnh nền)** $\rightarrow$ Tính điểm nguy cơ tử vong tim mạch 10 năm theo **SCORE2** (dựa vào 6 chỉ số sinh lý cơ bản).
  - `hasUnderlyingDisease = true`: **Luồng 2 (Có bệnh nền / Biến chứng)** $\rightarrow$ Phân tầng nguy cơ theo **Non-ASCVD** (dựa vào tổn thương cơ quan đích, đái tháo đường, suy thận, biến cố tim mạch đã mắc).

---

#### 🟢 LUỒNG 1: BỆNH NHÂN KHÔNG CÓ BỆNH NỀN (`hasUnderlyingDisease = false`)
Áp dụng cho người không có tiền sử bệnh tim mạch hay đái tháo đường. Hệ thống áp dụng thuật toán **SCORE2** để ước tính nguy cơ tim mạch 10 năm.

##### Bảng các trường gửi lên:
| Tên trường | Kiểu | Bắt buộc | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `healthProfileId` | UUID | **Có** | - | ID hồ sơ sức khỏe bệnh nhân |
| `hasUnderlyingDisease` | boolean | **Có** | `false` | Đặt là `false` |
| `facilityId` | UUID | Không | null | ID cơ sở y tế (nếu staff tạo) |
| `age` | number | Không | Tự tính | Tuổi thật (Nếu bỏ trống sẽ tự tính từ `dob` trong hồ sơ) |
| `gender` | string | Không | Từ hồ sơ | `"Nam"` hoặc `"Nữ"` (Nếu bỏ trống sẽ lấy từ hồ sơ) |
| `isSmoking` | boolean | Không | `false` | Có đang hút thuốc lá hay không |
| `systolicBp` *(hoặc `sbp`)* | number | Không | 120 | Huyết áp tâm thu (mmHg), vd: `145` |
| `diastolicBp` | number | Không | 80 | Huyết áp tâm trương (mmHg), vd: `90` |
| `totalCholesterol` *(hoặc `cholesterol`)* | number | Không | 5.0 | Mỡ máu toàn phần (mmol/L), vd: `5.8` |
| `hdlCholesterol` *(hoặc `hdl`)* | number | Không | 1.2 | Mỡ máu tốt HDL (mmol/L), vd: `1.4` |
| `glucoseFasting` | number | Không | null | Đường huyết lúc đói (mmol/L), vd: `5.6` |
| `heightCm` | number | Không | null | Chiều cao (cm), vd: `170` |
| `weightKg` | number | Không | null | Cân nặng (kg), vd: `72` (Hệ thống tự tính ra `bmi`) |

##### Ví dụ Request Body (Luồng 1):
```json
{
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "hasUnderlyingDisease": false,
  "age": 52,
  "gender": "Nam",
  "isSmoking": true,
  "systolicBp": 150,
  "diastolicBp": 95,
  "totalCholesterol": 6.2,
  "hdlCholesterol": 1.1,
  "heightCm": 168.0,
  "weightKg": 74.5,
  "glucoseFasting": 5.8
}
```

##### Ví dụ Response Trả về (Luồng 1):
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
  "evaluatedAt": "2026-09-17T08:15:00.000Z",
  "hasWarningAlert": true,
  "redFlags": [
    {
      "metric": "BLOOD_PRESSURE",
      "level": "WARNING",
      "title": "Huyết áp vượt ngưỡng an toàn (Tăng huyết áp độ 1)",
      "value": "150/95 mmHg"
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
      "value": "BMI: 26.40"
    },
    {
      "metric": "LIPID_CHOLESTEROL",
      "level": "WARNING",
      "title": "Mỡ máu (Total Cholesterol) tăng cao",
      "value": "6.2 mmol/L"
    }
  ]
}
```

---

#### 🔴 LUỒNG 2: BỆNH NHÂN CÓ BỆNH NỀN / BIẾN CHỨNG (`hasUnderlyingDisease = true`)
Áp dụng cho người **đã có bệnh nền mạn tính** (Đái tháo đường, tiền sử đột quỵ, bệnh mạch vành...) hoặc **có dấu hiệu tổn thương cơ quan đích** (Phì đại thất trái, đạm niệu, tổn thương đáy mắt, suy giảm chức năng thận eGFR).

##### Bảng các trường gửi lên:
| Tên trường | Kiểu | Bắt buộc | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `healthProfileId` | UUID | **Có** | - | ID hồ sơ sức khỏe bệnh nhân |
| `hasUnderlyingDisease` | boolean | **Có** | `true` | Đặt là `true` |
| `chronicDiseaseIds` | string[] | Không | `[]` | Mảng UUID các bệnh nền mạn tính đã chẩn đoán |
| **--- Khối 1: Tổn thương cơ quan đích ---** | | | | |
| `hasLeftVentricularHypertrophy` | boolean | Không | `false` | Phì đại thất trái (trên điện tim ECG / siêu âm tim) |
| `hasAlbuminuria` *(hoặc `hasAlbuminuriaOrMicroalbuminuria`)* | boolean | Không | `false` | Có Albumin / Microalbumin niệu (đạm niệu) |
| `hasRetinopathy` *(hoặc `hasCarotidWallDamage`)* | boolean | Không | `false` | Tổn thương đáy mắt / thành mạch cảnh do THA |
| `hasSilentBrainInfarct` *(hoặc `hasSilentInfarct`)* | boolean | Không | `false` | Tổn thương thầm lặng trên não (nhồi máu não im lặng) |
| **--- Khối 2: Đái tháo đường & Thận ---** | | | | |
| `diabetes` | boolean | Không | `false` | Bệnh nhân có mắc đái tháo đường không |
| `diabetesDurationYears` | number | Không | `0` | Số năm đã mắc đái tháo đường (vd: `12`) |
| `glycemicControl` | string | Không | null | Mức kiểm soát đường máu (`"Tốt"` / `"Không tốt"`) |
| `egfr` *(hoặc `eGFR`)* | number | Không | null | Độ lọc cầu thận (mL/phút/1.73m2, vd: `45` $\rightarrow$ Suy thận) |
| `acr` | number | Không | null | Tỷ lệ Albumin/Creatinin niệu (mg/g, vd: `35`) |
| **--- Khối 3: Tiền sử Biến cố Tim mạch nặng ---** | | | | |
| `stroke` | boolean | Không | `false` | Tiền sử đột quỵ não / tai biến mạch máu não |
| `hasMyocardialInfarction` | boolean | Không | `false` | Tiền sử nhồi máu cơ tim |
| `hasAcuteCoronarySyndrome` | boolean | Không | `false` | Tiền sử hội chứng vành cấp |
| `hasCoronaryArteryDisease` | boolean | Không | `false` | Bệnh lý động mạch vành mạn |
| `hasTia` | boolean | Không | `false` | Cơn thiếu máu não cục bộ thoáng qua (TIA) |
| `hasAorticAneurysm` | boolean | Không | `false` | Phình động mạch chủ |
| `hasPeripheralArteryDisease` | boolean | Không | `false` | Bệnh động mạch ngoại vi |
| `hasAtherosclerosis` | boolean | Không | `false` | Vữa xơ mạch máu lớn |
| `hasFamilialHypercholesterolemia` | boolean | Không | `false` | Tăng Cholesterol máu có tính gia đình |

##### Ví dụ Request Body (Luồng 2):
```json
{
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "hasUnderlyingDisease": true,
  "diabetes": true,
  "diabetesDurationYears": 12,
  "glycemicControl": "Không tốt",
  "hasLeftVentricularHypertrophy": true,
  "hasAlbuminuria": true,
  "hasRetinopathy": false,
  "hasSilentBrainInfarct": false,
  "egfr": 48.5,
  "stroke": false,
  "hasMyocardialInfarction": false,
  "systolicBp": 165,
  "diastolicBp": 100,
  "totalCholesterol": 6.8,
  "glucoseFasting": 9.2
}
```

##### Ví dụ Response Trả về (Luồng 2):
```json
{
  "id": "c9878011-89d2-43e1-bc6e-3402e118c888",
  "assessmentInputId": "f4b89045-3ef1-4ad9-bf9d-2101e405a222",
  "riskLevel": "VERY_HIGH",
  "riskScore": 15.0,
  "doctorId": null,
  "doctor": null,
  "conclusion": null,
  "recommendations": null,
  "evaluatedAt": "2026-09-17T08:16:00.000Z",
  "hasWarningAlert": true,
  "redFlags": [
    {
      "metric": "BLOOD_PRESSURE",
      "level": "DANGER",
      "title": "Huyết áp tăng cao (Tăng huyết áp độ 2/3)",
      "value": "165/100 mmHg"
    },
    {
      "metric": "BLOOD_GLUCOSE",
      "level": "DANGER",
      "title": "Đường huyết đói vượt ngưỡng bình thường",
      "value": "9.2 mmol/L"
    },
    {
      "metric": "LIPID_CHOLESTEROL",
      "level": "WARNING",
      "title": "Mỡ máu (Total Cholesterol) tăng cao",
      "value": "6.8 mmol/L"
    },
    {
      "metric": "ORGAN_DAMAGE",
      "level": "DANGER",
      "title": "Phát hiện dấu hiệu tổn thương cơ quan đích hoặc biến chứng tim mạch",
      "value": "Có tổn thương cơ quan đích / Biến chứng tim mạch"
    }
  ]
}
```

---

### 3. Xem Chi Tiết Phiếu Đánh Giá
- **Method**: `GET`
- **Path**: `/risk-assessments/:id` (với `:id` là ID của phiếu `RiskFactorAssessmentInput`)
- **Quyền**: Bearer Token (`AppAuth` hoặc `StaffAuth`)

#### 📤 Output (200 OK)
Trả về chi tiết đối tượng kết quả phân tầng, thông tin bác sĩ thẩm định (nếu có) và danh sách cờ đỏ cảnh báo `redFlags`.

---

### 4. Bác sĩ Thẩm Định & Kết Luận Chuyên Khoa
- **Method**: `POST`
- **Path**: `/risk-assessments/:id/evaluate`
- **Quyền**: Bearer Token của Bác sĩ (`StaffAuth`, role `DOCTOR` hoặc `ADMIN`)

#### 📥 Input (Body - `EvaluateRiskAssessmentDto`)
```json
{
  "riskLevel": "VERY_HIGH",
  "riskScore": 12.5,
  "conclusion": "Bệnh nhân có nguy cơ tim mạch rất cao do kết hợp THA độ 2, hút thuốc lá và tăng cholesterol.",
  "recommendations": "Khởi động điều trị phối hợp 2 nhóm thuốc hạ áp, statin liều trung bình và tư vấn cai thuốc lá."
}
```

#### 📤 Output (200 OK)
Trả về phiếu đánh giá đã được cập nhật trạng thái `EVALUATED` kèm thông tin bác sĩ phụ trách và thời gian thẩm định.

---

### 5. Danh Sách Phiếu Đánh Giá Tại Cơ Sở Y Tế (Staff/Doctor)
- **Method**: `GET`
- **Path**: `/risk-assessments/staff`
- **Quyền**: Bearer Token (`StaffAuth`)
- **Query Params hỗ trợ**: `healthProfileId`, `facilityId`, `riskLevel` (`LOW`, `HIGH`, `VERY_HIGH`), `fromDate`, `toDate`, `page`, `limit`.

