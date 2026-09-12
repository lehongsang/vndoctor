# 14. Module Care Packages (Gói Dịch Vụ Chăm Sóc Sức Khỏe)

## 📌 Tổng quan
Module `care-packages` quản lý danh mục các gói dịch vụ chăm sóc sức khỏe của cơ sở y tế:
- **Phân loại gói**: `STANDARD` (Gói tiêu chuẩn), `VIP` (Gói cao cấp - yêu cầu có Bác sĩ chuyên gia cố vấn).
- **Thuộc tính gói**: Tên gói, mã gói duy nhất (`PKG-CARDIO-30D`), thời hạn (`duration_days`), giá niêm yết (`price_amount`), mô tả quyền lợi.
- **Trạng thái**: `ACTIVE` (Đang mở bán/cung cấp), `INACTIVE` (Tạm ngưng).

---

## 🚀 Danh sách API

### 1. Tạo Gói Chăm Sóc Mới (Admin Cơ sở Y tế)
- **Method**: `POST`
- **Path**: `/care-packages`
- **Quyền**: `StaffAuthGuard` (`ADMIN`)

#### 📥 Input (Body - `CreateCarePackageDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `name` | string | Có | Tên gói chăm sóc |
| `type` | enum | Không | `STANDARD` hoặc `VIP` (Mặc định: `STANDARD`) |
| `description` | string | Không | Mô tả chi tiết quyền lợi gói |
| `durationDays` | number | Có | Thời hạn gói tính theo ngày (30, 90, 180, 365) |
| `priceAmount` | number | Có | Giá niêm yết của gói (VND) |
| `facilityId` | UUID | Không | ID cơ sở y tế (Mặc định lấy theo staff đăng nhập) |
| `status` | enum | Không | `ACTIVE`, `INACTIVE` (Mặc định: `ACTIVE`) |

*Ví dụ Body:*
```json
{
  "name": "Gói Chăm Sóc Tim Mạch Toàn Diện 30 Ngày",
  "type": "STANDARD",
  "description": "Bao gồm theo dõi huyết áp hàng ngày, bác sĩ chuyên khoa tư vấn trực tuyến và điều dưỡng hỗ trợ 24/7.",
  "durationDays": 30,
  "priceAmount": 1500000,
  "status": "ACTIVE"
}
```

#### 📤 Output (201 Created)
```json
{
  "id": "pkg-uuid-1",
  "facilityId": "facility-uuid-1",
  "code": "PKG-CARDIO-30D",
  "name": "Gói Chăm Sóc Tim Mạch Toàn Diện 30 Ngày",
  "type": "STANDARD",
  "description": "Bao gồm theo dõi huyết áp hàng ngày...",
  "durationDays": 30,
  "priceAmount": 1500000,
  "status": "ACTIVE",
  "createdAt": "2026-09-08T08:00:00.000Z"
}
```

---

### 2. Danh sách Gói Chăm Sóc (Public / App / CMS)
- **Method**: `GET`
- **Path**: `/care-packages`
- **Quyền**: Public
- **Input (Query - `QueryCarePackageDto`)**:
  - `facilityId`: Lọc theo cơ sở y tế
  - `type`: `STANDARD` | `VIP`
  - `status`: `ACTIVE` | `INACTIVE`
  - `search`: Tìm theo tên hoặc mã gói
  - `page`: Số trang (Mặc định: 1)
  - `limit`: Số phần tử trên trang (Mặc định: 20)

---

### 3. Chi tiết Gói Chăm Sóc
- **Method**: `GET`
- **Path**: `/care-packages/:id`
- **Quyền**: Public

---

### 4. Cập nhật Thông tin Gói (Admin)
- **Method**: `PATCH`
- **Path**: `/care-packages/:id`
- **Quyền**: `StaffAuthGuard` (`ADMIN`)
- **Input (Body - `UpdateCarePackageDto`)**: `name`, `type`, `description`, `durationDays`, `priceAmount`, `status`

---

### 5. Bật / Tắt Trạng thái Gói
- **Method**: `PATCH`
- **Path**: `/care-packages/:id/status`
- **Quyền**: `StaffAuthGuard` (`ADMIN`)
- **Input (Body - `UpdateCarePackageStatusDto`)**:
```json
{
  "status": "INACTIVE"
}
```
