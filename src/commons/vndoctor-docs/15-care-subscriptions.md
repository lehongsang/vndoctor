# 15. Module Care Subscriptions (Đăng Ký Gói & Phân Công Care Team)

## 📌 Tổng quan
Module `care-subscriptions` quản lý vòng đời sử dụng gói dịch vụ y tế của Bệnh nhân:
1. **Bệnh nhân đăng ký (Mobile App)**: Tạo subscription ở trạng thái `PENDING` (chưa tính ngày bắt đầu/hết hạn và chưa có Care Team).
2. **Điều phối viên phân công (Web CMS)**: Chỉ định Bác sĩ chính (`assignedDoctorId`), Điều dưỡng hỗ trợ (`assignedNurseId`), và Bác sĩ chuyên gia (`assignedExpertId` - bắt buộc cho gói `VIP`).
3. **Kích hoạt tự động (Atomic Transaction)**:
   - Validate nhân sự đúng viện, đúng vai trò và đang hoạt động.
   - Tính toán: `startedAt = NOW()`, `expiresAt = NOW() + durationDays`.
   - Chuyển `status = ACTIVE`.
   - Tự động khởi tạo phòng chat nhóm `CARE_TEAM` và gửi tin nhắn chào mừng `SYSTEM`.
4. **Tự động hết hạn (Scheduler)**: Quét các gói quá hạn chuyển sang `EXPIRED`.

---

## 🚀 Danh sách API

### 1. Bệnh nhân Đăng ký Gói Chăm Sóc (App Mobile)
- **Method**: `POST`
- **Path**: `/care-subscriptions`
- **Quyền**: `AppAuthGuard`

#### 📥 Input (Body - `CreateCareSubscriptionDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `healthProfileId` | UUID | Có | ID hồ sơ sức khỏe tham gia gói |
| `carePackageId` | UUID | Có | ID gói dịch vụ chăm sóc sức khỏe |

*Ví dụ Body:*
```json
{
  "healthProfileId": "profile-uuid-1",
  "carePackageId": "pkg-uuid-1"
}
```

#### 📤 Output (201 Created)
```json
{
  "id": "sub-uuid-1",
  "healthProfileId": "profile-uuid-1",
  "carePackageId": "pkg-uuid-1",
  "status": "PENDING",
  "startedAt": null,
  "expiresAt": null,
  "assignedDoctorId": null,
  "assignedNurseId": null,
  "assignedExpertId": null,
  "createdAt": "2026-09-08T08:30:00.000Z"
}
```

---

### 2. Bệnh nhân xem Danh sách Gói Đã Đăng Ký (App Mobile)
- **Method**: `GET`
- **Path**: `/care-subscriptions/me`
- **Quyền**: `AppAuthGuard`
- **Input (Query)**: `status`, `page`, `limit`

---

### 3. Điều phối viên xem Danh sách Chờ & Đang Hoạt Động (CMS)
- **Method**: `GET`
- **Path**: `/care-subscriptions`
- **Quyền**: `StaffAuthGuard`
- **Input (Query - `QueryCareSubscriptionDto`)**:
  - `facilityId`: Lọc theo cơ sở y tế
  - `status`: `PENDING` | `ACTIVE` | `EXPIRED` | `CANCELLED`
  - `healthProfileId`: Lọc theo bệnh nhân
  - `doctorId`: Lọc theo bác sĩ phụ trách
  - `nurseId`: Lọc theo điều dưỡng
  - `search`: Tìm kiếm theo tên bệnh nhân hoặc tên gói
  - `page`, `limit`

---

### 4. Xem Chi tiết Đăng ký & Đội ngũ Care Team
- **Method**: `GET`
- **Path**: `/care-subscriptions/:id`
- **Quyền**: `StaffAuthGuard` / `AppAuthGuard`

---

### 5. Phân công Care Team & Kích hoạt Gói (Web CMS)
- **Method**: `POST`
- **Path**: `/care-subscriptions/:id/assign-and-activate`
- **Quyền**: `StaffAuthGuard` (`ADMIN`, `DOCTOR`)

#### 📥 Input (Body - `AssignAndActivateCareSubscriptionDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `assignedDoctorId` | UUID | Có | ID Bác sĩ chính (Role: `DOCTOR`, cùng viện) |
| `assignedNurseId` | UUID | Có | ID Điều dưỡng hỗ trợ (Role: `NURSE`, cùng viện) |
| `assignedExpertId` | UUID | Tùy chọn | ID Bác sĩ Chuyên gia (Bắt buộc nếu gói `VIP`) |

*Ví dụ Body:*
```json
{
  "assignedDoctorId": "doc-uuid-1",
  "assignedNurseId": "nurse-uuid-1",
  "assignedExpertId": "expert-uuid-1"
}
```

#### 📤 Output (200 OK)
```json
{
  "id": "sub-uuid-1",
  "status": "ACTIVE",
  "startedAt": "2026-09-08T09:00:00.000Z",
  "expiresAt": "2026-10-08T09:00:00.000Z",
  "assignedDoctorId": "doc-uuid-1",
  "assignedNurseId": "nurse-uuid-1",
  "assignedExpertId": "expert-uuid-1",
  "updatedAt": "2026-09-08T09:00:00.000Z"
}
```

---

### 6. Cập nhật Nhân sự Care Team khi Đổi ca / Nghỉ phép (Admin)
- **Method**: `PATCH`
- **Path**: `/care-subscriptions/:id/care-team`
- **Quyền**: `StaffAuthGuard` (`ADMIN`)
- **Input (Body - `UpdateCareTeamDto`)**: `assignedDoctorId`, `assignedNurseId`, `assignedExpertId`

---

### 7. Hủy Gói Đăng Ký (Admin)
- **Method**: `POST`
- **Path**: `/care-subscriptions/:id/cancel`
- **Quyền**: `StaffAuthGuard` (`ADMIN`)
