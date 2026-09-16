# 08. Module Health Records (Theo dõi Chỉ số Sức khỏe Cá nhân)

## 📌 Tổng quan
Module `health-records` quản lý nhật ký các lần tự đo lường chỉ số sinh hiệu cá nhân của bệnh nhân tại nhà:
- `BLOOD_PRESSURE`: Huyết áp (mmHg)
- `HEART_RATE`: Nhịp tim (bpm)
- `BLOOD_GLUCOSE`: Đường huyết (mmol/L hoặc mg/dL)
- `SPO2`: Nồng độ oxy trong máu (%)
- `BODY_TEMPERATURE`: Thân nhiệt (°C)
- `WEIGHT`: Cân nặng (kg)

---

## 🚀 Danh sách API

### 1. Ghi nhận chỉ số đo lường mới (App)
- **Method**: `POST`
- **Path**: `/health-records`
- **Quyền**: `AppAuthGuard`

#### 📥 Input (Body - `CreateHealthRecordDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `healthProfileId` | UUID | Có | ID hồ sơ sức khỏe |
| `metricType` | enum | Có | Loại chỉ số theo Enum |
| `valueNumeric` | decimal | Có | Giá trị chính (HA tâm thu / Sys, Nhịp tim,...) |
| `secondaryValue` | decimal | Không | Giá trị phụ (HA tâm trương / Dia khi đo HA) |
| `unit` | string | Có | Đơn vị đo (mmHg, bpm, mmol/L...) |
| `note` | string | Không | Ghi chú ngữ cảnh đo (sau ăn, trước ngủ...) |
| `measuredAt` | timestamp | Không | Thời điểm đo (Mặc định: hiện tại) |

*Ví dụ Body (Đo huyết áp):*
```json
{
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "metricType": "BLOOD_PRESSURE",
  "valueNumeric": 150,
  "secondaryValue": 85,
  "unit": "mmHg",
  "note": "Đo sau khi ngủ dậy",
  "measuredAt": "2026-09-08T06:30:00.000Z"
}
```

#### 📤 Output (201 Created) - Tự động đánh giá theo VNHA
Khi lưu bản ghi huyết áp (`BLOOD_PRESSURE`), API tự động phân độ và trả về đối tượng `evaluation`:
```json
{
  "id": "b3e0c012-3214-41d9-8ff4-9fb561234567",
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "metricType": "BLOOD_PRESSURE",
  "valueNumeric": 150,
  "secondaryValue": 85,
  "unit": "mmHg",
  "note": "Đo sau khi ngủ dậy",
  "measuredAt": "2026-09-08T06:30:00.000Z",
  "evaluation": {
    "level": "STAGE_1",
    "label": "THA độ 1",
    "subType": "THA tâm THU đơn độc",
    "warningMessage": "Chỉ số HA ở mức THA độ 1 (THA tâm THU đơn độc). Cần điều chỉnh lối sống và tham khảo ý kiến bác sĩ.",
    "isDanger": false
  }
}
```

---

### 2. Lấy Tóm tắt Chỉ số mới nhất của Hồ sơ
- **Method**: `GET`
- **Path**: `/health-records/summary/:healthProfileId`
- **Quyền**: `AppAuthGuard`
- **Query Params**: `metricType` (tùy chọn: lọc riêng 1 loại chỉ số như `BLOOD_PRESSURE` hoặc bỏ trống để lấy tất cả chỉ số).

#### 📤 Output (200 OK)
```json
{
  "BLOOD_PRESSURE": {
    "id": "rec-1",
    "valueNumeric": 150,
    "secondaryValue": 85,
    "unit": "mmHg",
    "measuredAt": "2026-09-08T06:30:00.000Z",
    "evaluation": {
      "level": "STAGE_1",
      "label": "THA độ 1",
      "subType": "THA tâm THU đơn độc",
      "warningMessage": "Chỉ số HA ở mức THA độ 1 (THA tâm THU đơn độc). Cần điều chỉnh lối sống và tham khảo ý kiến bác sĩ.",
      "isDanger": false
    }
  },
  "HEART_RATE": {
    "id": "rec-2",
    "valueNumeric": 75,
    "secondaryValue": null,
    "unit": "bpm",
    "measuredAt": "2026-09-08T06:30:00.000Z",
    "evaluation": null
  }
}
```

---

### 3. Lịch sử đo lường chỉ số
- **Method**: `GET`
- **Path**: `/health-records`
- **Quyền**: `AppAuthGuard`
- **Input (Query)**: `healthProfileId`, `metricType`, `fromDate`, `toDate`, `page`, `limit`
- **Output**: Mảng các bản ghi (kèm `evaluation` tương ứng nếu là `BLOOD_PRESSURE`).

---

### 4. Bảng Phân độ Huyết áp theo VNHA (30 điều kiện lâm sàng)

| STT | Phân độ (`level`) | Nhãn (`label`) | Kiểu phụ (`subType`) | Điều kiện Tâm thu (SYS) | Điều kiện Tâm trương (DIA) | Cảnh báo nguy hiểm (`isDanger`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `INVALID_DATA` | Lỗi | - | Mọi giá trị | DIA ≥ SYS | ❌ |
| 2 | `CRITICAL_DANGER` | Cảnh báo 1 | - | SYS < 70 | DIA < 70 | ⚠️ Có |
| 3 | `CRITICAL_DANGER` | Cảnh báo 1 | - | SYS ≥ 70 | DIA < 40 | ⚠️ Có |
| 4 | `LOW_DIASTOLIC` | HA tâm trương thấp | - | 70 ≤ SYS ≤ 89 | 40 ≤ DIA ≤ 60 | ❌ |
| 5 | `LOW_SYSTOLIC` | HA tâm thu thấp | - | 70 ≤ SYS ≤ 89 | 60 < DIA ≤ 84 | ❌ |
| 6 | `NORMAL` | Huyết áp không tăng | - | 90 ≤ SYS ≤ 129 | DIA < 85 | ❌ |
| 7 | `PRE_HYPERTENSION` | Tiền THA | - | 90 ≤ SYS ≤ 129 | 85 ≤ DIA ≤ 89 | ❌ |
| 8 | `STAGE_1` | THA độ 1 | THA tâm trương đơn độc | 90 ≤ SYS ≤ 129 | 90 ≤ DIA ≤ 99 | ❌ |
| 9 | `STAGE_2` | THA độ 2 | THA tâm trương đơn độc | 90 ≤ SYS ≤ 129 | 100 ≤ DIA ≤ 109 | ❌ |
| 10 | `STAGE_3` | THA độ 3 | THA tâm trương đơn độc | 90 ≤ SYS ≤ 129 | DIA ≥ 110 | ⚠️ Có |
| 11 | `PRE_HYPERTENSION` | Tiền THA | - | 130 ≤ SYS ≤ 139 | DIA < 90 | ❌ |
| 12 | `STAGE_1` | THA độ 1 | THA tâm trương đơn độc | 130 ≤ SYS ≤ 139 | 90 ≤ DIA ≤ 99 | ❌ |
| 13 | `STAGE_2` | THA độ 2 | THA tâm trương đơn độc | 130 ≤ SYS ≤ 139 | 100 ≤ DIA ≤ 109 | ❌ |
| 14 | `STAGE_3` | THA độ 3 | THA tâm trương đơn độc | 130 ≤ SYS ≤ 139 | DIA ≥ 110 | ⚠️ Có |
| 15 | `STAGE_1` | THA độ 1 | THA tâm THU đơn độc | 140 ≤ SYS ≤ 159 | DIA < 90 | ❌ |
| 16 | `STAGE_1` | THA độ 1 | - | 140 ≤ SYS ≤ 159 | 90 ≤ DIA ≤ 99 | ❌ |
| 17 | `STAGE_2` | THA độ 2 | - | 140 ≤ SYS ≤ 159 | 100 ≤ DIA ≤ 109 | ❌ |
| 18 | `STAGE_3` | THA độ 3 | - | 140 ≤ SYS ≤ 159 | DIA ≥ 110 | ⚠️ Có |
| 19 | `STAGE_2` | THA độ 2 | THA tâm THU đơn độc | 160 ≤ SYS ≤ 179 | DIA < 90 | ❌ |
| 20 | `STAGE_2` | THA độ 2 | - | 160 ≤ SYS ≤ 179 | 90 ≤ DIA ≤ 109 | ❌ |
| 21 | `STAGE_3` | THA độ 3 | - | 160 ≤ SYS ≤ 179 | DIA ≥ 110 | ⚠️ Có |
| 22 | `STAGE_3` | THA độ 3 | THA tâm THU đơn độc | SYS ≥ 180 | DIA < 90 | ⚠️ Có |
| 23 | `STAGE_3` | THA độ 3 | - | SYS ≥ 180 | DIA ≥ 90 | ⚠️ Có |
