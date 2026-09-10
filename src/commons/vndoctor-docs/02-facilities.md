# 02. Module Facilities (Cơ sở Y tế)

## 📌 Tổng quan
Module `facilities` quản lý mạng lưới các cơ sở y tế theo phân tuyến hành chính y tế:
- `PROVINCIAL_HOSPITAL`: Bệnh viện tuyến Tỉnh / Thành phố
- `DISTRICT_HOSPITAL`: Bệnh viện / Trung tâm Y tế tuyến Huyện / Quận
- `COMMUNE_HEALTH_STATION`: Trạm Y tế tuyến Xã / Phường
- `CLINIC`: Phòng khám đa khoa / chuyên khoa
- `OTHER`: Cơ sở y tế khác

---

## 🚀 Danh sách API

### 1. Lấy danh sách Cơ sở y tế
- **Method**: `GET`
- **Path**: `/facilities`
- **Quyền**: Public / App / Staff
- **Mô tả**: Tìm kiếm và phân trang danh sách các cơ sở y tế.

#### 📥 Input (Query - `QueryFacilityDto`)
| Tham số | Kiểu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `page` | number | 1 | Số trang |
| `limit` | number | 20 | Số lượng bản ghi / trang |
| `search` | string | - | Từ khóa tìm kiếm (tên, mã cơ sở, SĐT) |
| `facilityType` | enum | - | Lọc theo loại cơ sở |
| `isActive` | boolean | - | Lọc theo trạng thái hoạt động |

#### 📤 Output (200 OK)
```json
{
  "data": [
    {
      "id": "e1112233-4455-6677-8899-aabbccddeeff",
      "facilityCode": "BV-TINH-01",
      "facilityName": "Bệnh viện Đa khoa Tỉnh",
      "facilityType": "PROVINCIAL_HOSPITAL",
      "phoneNumber": "02363821111",
      "address": "Số 123 Đường Trần Phú, TP. Đà Nẵng",
      "isActive": true,
      "createdAt": "2026-09-08T00:00:00.000Z",
      "updatedAt": "2026-09-08T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

### 2. Xem chi tiết Cơ sở y tế
- **Method**: `GET`
- **Path**: `/facilities/:id`
- **Quyền**: Public / App / Staff

#### 📥 Input (Param)
- `id` (UUID): ID cơ sở y tế.

#### 📤 Output (200 OK)
```json
{
  "id": "e1112233-4455-6677-8899-aabbccddeeff",
  "facilityCode": "BV-TINH-01",
  "facilityName": "Bệnh viện Đa khoa Tỉnh",
  "facilityType": "PROVINCIAL_HOSPITAL",
  "phoneNumber": "02363821111",
  "address": "Số 123 Đường Trần Phú, TP. Đà Nẵng",
  "isActive": true,
  "createdAt": "2026-09-08T00:00:00.000Z"
}
```

---

### 3. Thêm mới Cơ sở y tế
- **Method**: `POST`
- **Path**: `/facilities`
- **Quyền**: `StaffAuthGuard` (`ADMIN`)

#### 📥 Input (Body - `CreateFacilityDto`)
```json
{
  "facilityName": "Bệnh viện Đa khoa Tỉnh",
  "facilityType": "PROVINCIAL_HOSPITAL",
  "phoneNumber": "02363821111",
  "address": "Số 123 Đường Trần Phú, TP. Đà Nẵng",
  "isActive": true
}
```

---

### 4. Cập nhật Cơ sở y tế
- **Method**: `PATCH`
- **Path**: `/facilities/:id`
- **Quyền**: `StaffAuthGuard` (`ADMIN`)
