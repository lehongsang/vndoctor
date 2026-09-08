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
| `valueNumeric` | decimal | Có | Giá trị chính (HA tâm thu, Nhịp tim,...) |
| `secondaryValue` | decimal | Không | Giá trị phụ (HA tâm trương khi đo HA) |
| `unit` | string | Có | Đơn vị đo (mmHg, bpm, mmol/L...) |
| `note` | string | Không | Ghi chú ngữ cảnh đo (sau ăn, trước ngủ...) |
| `measuredAt` | timestamp | Không | Thời điểm đo (Mặc định: hiện tại) |

*Ví dụ Body (Đo huyết áp):*
```json
{
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "metricType": "BLOOD_PRESSURE",
  "valueNumeric": 135,
  "secondaryValue": 85,
  "unit": "mmHg",
  "note": "Đo sau khi ngủ dậy",
  "measuredAt": "2026-09-08T06:30:00.000Z"
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
    "valueNumeric": 135,
    "secondaryValue": 85,
    "unit": "mmHg",
    "measuredAt": "2026-09-08T06:30:00.000Z"
  },
  "HEART_RATE": {
    "id": "rec-2",
    "valueNumeric": 75,
    "secondaryValue": null,
    "unit": "bpm",
    "measuredAt": "2026-09-08T06:30:00.000Z"
  }
}
```

---

### 3. Lịch sử đo lường chỉ số
- **Method**: `GET`
- **Path**: `/health-records`
- **Quyền**: `AppAuthGuard`
- **Input (Query)**: `healthProfileId`, `metricType`, `fromDate`, `toDate`, `page`, `limit`
