# 15. Module Care Subscriptions (Đăng Ký Gói, Xác Nhận & Phân Công Care Team)

## 📌 Tổng quan
Module `care-subscriptions` quản lý vòng đời sử dụng gói dịch vụ y tế của Bệnh nhân với 2 kênh đăng ký chính:

### 🔄 Các kênh đăng ký và quy trình xác nhận:
1. **Kênh 1: Bệnh nhân tự đăng ký (Mobile App)**:
   - Bệnh nhân chọn gói và hồ sơ của mình trên Mobile App.
   - Subscription được tạo ở trạng thái `PENDING` với `isPatientConfirmed = true` và `patientConfirmedAt = NOW()`.
   - Chờ Điều phối viên/Bác sĩ tại CSYT tiếp nhận và phân công Care Team để kích hoạt.

2. **Kênh 2: Nhân viên CSYT đăng ký tại cơ sở y tế (Web CMS)**:
   - Bác sĩ/Nhân viên CSYT tư vấn và đăng ký gói trực tiếp cho hồ sơ bệnh nhân tại phòng khám (`POST /care-subscriptions/staff-register`).
   - Subscription được tạo ở trạng thái `PENDING`, `isPatientConfirmed = false`, lưu `registeredByStaffId`.
   - **Xác nhận từ bệnh nhân (Mobile App)**:
     - Bệnh nhân mở App xem danh sách gói chờ duyệt (`GET /care-subscriptions/pending-confirmations`).
     - **Đồng ý**: Bệnh nhân bấm Xác nhận (`PATCH /care-subscriptions/:id/confirm`) -> `isPatientConfirmed = true`, `patientConfirmedAt = NOW()`.
     - **Từ chối**: Bệnh nhân bấm Từ chối (`PATCH /care-subscriptions/:id/reject`) -> `status = CANCELLED`, lưu `rejectionReason` và hoàn lại lượt đăng ký của gói.

3. **Điều phối viên phân công Care Team & Kích hoạt gói (Web CMS)**:
   - Điều phối viên chỉ định Bác sĩ chính (`assignedDoctorId`), Điều dưỡng hỗ trợ (`assignedNurseId`), và Chuyên gia (`assignedExpertId` - bắt buộc cho gói `VIP`).
   - **Ràng buộc xác nhận**: Bắt buộc gói phải đã được bệnh nhân xác nhận (`isPatientConfirmed = true`).
   - **Kích hoạt tự động (Atomic Transaction)**:
     - Tính toán thời hạn: `startedAt = NOW()`, `expiresAt = NOW() + durationDays`.
     - Chuyển `status = ACTIVE`.
     - Tự động khởi tạo 2 kênh chat 1-1 riêng biệt (Bác sĩ - Bệnh nhân, Điều dưỡng - Bệnh nhân) kèm tin nhắn chào mừng `SYSTEM`.

4. **Tự động hết hạn (Scheduler)**: Quét các gói quá hạn (`expiresAt < NOW()`) và chuyển sang `EXPIRED`.

---

## 🗄️ Cấu trúc Dữ liệu `PatientCareSubscription`

| Trường | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `id` | UUID | Khóa chính |
| `healthProfileId` | UUID | ID hồ sơ sức khỏe của bệnh nhân |
| `carePackageId` | UUID | ID gói chăm sóc sức khỏe |
| `status` | ENUM | `PENDING` \| `ACTIVE` \| `EXPIRED` \| `CANCELLED` |
| `isPatientConfirmed` | BOOLEAN | Trạng thái xác nhận của bệnh nhân (`true`: tự mua hoặc đã xác nhận; `false`: CSYT đăng ký hộ chờ duyệt) |
| `patientConfirmedAt` | TIMESTAMPTZ | Thời điểm bệnh nhân bấm xác nhận trên App |
| `registeredByStaffId` | UUID | ID nhân viên CSYT đã đăng ký hộ tại cơ sở y tế |
| `rejectionReason` | TEXT | Lý do bệnh nhân từ chối gói chăm sóc do CSYT đề xuất |
| `assignedDoctorId` | UUID | ID Bác sĩ chính phụ trách |
| `assignedNurseId` | UUID | ID Điều dưỡng hỗ trợ |
| `assignedExpertId` | UUID | ID Chuyên gia y tế (cho gói VIP) |
| `startedAt` | TIMESTAMPTZ | Thời điểm kích hoạt gói |
| `expiresAt` | TIMESTAMPTZ | Thời điểm hết hạn gói |

---

## 🚀 Danh sách API Chi Tiết

### 1. Bệnh nhân tự Đăng ký Gói Chăm Sóc (Mobile App)
- **Method**: `POST`
- **Path**: `/care-subscriptions`
- **Quyền**: `AppAuthGuard`
- **Mô tả**: Bệnh nhân tự đăng ký gói trên App. `isPatientConfirmed` tự động set `true`.

#### 📥 Input (Body - `CreateCareSubscriptionDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `healthProfileId` | UUID | Có | ID hồ sơ sức khỏe tham gia gói |
| `carePackageId` | UUID | Có | ID gói dịch vụ chăm sóc sức khỏe |

```json
{
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "carePackageId": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"
}
```

---

### 2. Nhân viên CSYT Đăng ký Gói cho Bệnh nhân tại Viện (CMS)
- **Method**: `POST`
- **Path**: `/care-subscriptions/staff-register`
- **Quyền**: `StaffAuthGuard`, `StaffRolesGuard` (`ADMIN`, `DOCTOR`, `NURSE`, `STAFF`)
- **Mô tả**: Bác sĩ/Nhân viên CSYT đăng ký gói cho hồ sơ bệnh nhân khi khám trực tiếp. Subscription được tạo ở trạng thái `PENDING`, `isPatientConfirmed = false`, `registeredByStaffId = staff.id`.

#### 📥 Input (Body - `CreateCareSubscriptionDto`)
```json
{
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "carePackageId": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"
}
```

#### 📤 Output (201 Created)
```json
{
  "id": "sub-uuid-1",
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "carePackageId": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  "status": "PENDING",
  "isPatientConfirmed": false,
  "patientConfirmedAt": null,
  "registeredByStaffId": "staff-uuid-1",
  "rejectionReason": null,
  "startedAt": null,
  "expiresAt": null,
  "assignedDoctorId": null,
  "assignedNurseId": null,
  "assignedExpertId": null,
  "createdAt": "2026-09-25T08:00:00.000Z"
}
```

---

### 3. Bệnh nhân xem Danh sách Gói chờ Xác Nhận (Mobile App)
- **Method**: `GET`
- **Path**: `/care-subscriptions/pending-confirmations`
- **Quyền**: `AppAuthGuard`
- **Mô tả**: Trả về tất cả các gói dịch vụ do CSYT đăng ký hộ cho các hồ sơ thuộc tài khoản App đang đăng nhập (`isPatientConfirmed = false`, `status = PENDING`).

#### 📤 Output (200 OK - Array)
```json
[
  {
    "id": "sub-uuid-1",
    "status": "PENDING",
    "isPatientConfirmed": false,
    "healthProfile": {
      "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "fullName": "Trần Thị Mai",
      "hospitalPatientCode": "BN-20260925-ABCD"
    },
    "carePackage": {
      "id": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      "name": "Gói Chăm Sóc Toàn Diện Tim Mạch 30 Ngày",
      "priceAmount": 1500000,
      "durationDays": 30,
      "facility": {
        "id": "fac-uuid-1",
        "facilityName": "Bệnh viện Đa khoa Quốc tế"
      }
    },
    "registeredByStaff": {
      "id": "staff-uuid-1",
      "fullName": "BS. Nguyễn Văn An"
    },
    "createdAt": "2026-09-25T08:00:00.000Z"
  }
]
```

---

### 4. Bệnh nhân Xác nhận Gói Chăm Sóc (Mobile App)
- **Method**: `PATCH`
- **Path**: `/care-subscriptions/:id/confirm`
- **Quyền**: `AppAuthGuard`
- **Mô tả**: Bệnh nhân đồng ý kích hoạt gói cho hồ sơ của mình. Cập nhật `isPatientConfirmed = true`, `patientConfirmedAt = NOW()`.

#### 📤 Output (200 OK)
```json
{
  "id": "sub-uuid-1",
  "status": "PENDING",
  "isPatientConfirmed": true,
  "patientConfirmedAt": "2026-09-25T08:15:00.000Z"
}
```

---

### 5. Bệnh nhân Từ chối Gói Chăm Sóc (Mobile App)
- **Method**: `PATCH`
- **Path**: `/care-subscriptions/:id/reject`
- **Quyền**: `AppAuthGuard`
- **Mô tả**: Bệnh nhân từ chối gói do CSYT đề xuất. Chuyển `status = CANCELLED`, lưu `rejectionReason` và hoàn lại 1 slot cho `carePackage.maxSubscribers` (nếu có giới hạn).

#### 📥 Input (Body - `RejectCareSubscriptionDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `reason` | String (tối đa 500 ký tự) | Tùy chọn | Lý do từ chối gói chăm sóc |

```json
{
  "reason": "Tôi chưa có nhu cầu sử dụng gói này trong thời điểm hiện tại"
}
```

#### 📤 Output (200 OK)
```json
{
  "id": "sub-uuid-1",
  "status": "CANCELLED",
  "isPatientConfirmed": false,
  "rejectionReason": "Tôi chưa có nhu cầu sử dụng gói này trong thời điểm hiện tại"
}
```

---

### 6. Bệnh nhân xem Danh sách Tất cả Gói Đã Đăng Ký (Mobile App)
- **Method**: `GET`
- **Path**: `/care-subscriptions/me`
- **Quyền**: `AppAuthGuard`
- **Input (Query)**: `status`, `page`, `limit`

---

### 7. Điều phối viên xem Danh sách Đăng ký tại CSYT (CMS)
- **Method**: `GET`
- **Path**: `/care-subscriptions`
- **Quyền**: `StaffAuthGuard`, `StaffRolesGuard`
- **Input (Query - `QueryCareSubscriptionDto`)**:
  - `facilityId`: Lọc theo cơ sở y tế
  - `status`: `PENDING` | `ACTIVE` | `EXPIRED` | `CANCELLED`
  - `isPatientConfirmed`: Lọc theo trạng thái đã xác nhận (`true` / `false`)
  - `healthProfileId`: Lọc theo ID hồ sơ sức khỏe
  - `doctorId`: Lọc theo bác sĩ phụ trách
  - `nurseId`: Lọc theo điều dưỡng
  - `search`: Tìm kiếm theo tên bệnh nhân hoặc tên gói
  - `page`, `limit`

---

### 8. Xem Chi tiết Đăng ký & Đội ngũ Care Team
- **Method**: `GET`
- **Path**: `/care-subscriptions/:id`
- **Quyền**: `StaffAuthGuard`

---

### 9. Phân công Care Team & Kích hoạt Gói (CMS)
- **Method**: `POST`
- **Path**: `/care-subscriptions/:id/assign-and-activate`
- **Quyền**: `StaffAuthGuard`, `StaffRolesGuard` (`ADMIN`, `DOCTOR`)
- **Ràng buộc**:
  - Subscription phải ở trạng thái `PENDING`.
  - Bắt buộc `isPatientConfirmed === true` (Bệnh nhân phải đã bấm xác nhận trên App nếu là gói do CSYT mua hộ).

#### 📥 Input (Body - `AssignAndActivateCareSubscriptionDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `assignedDoctorId` | UUID | Có | ID Bác sĩ chính (Role: `DOCTOR`, cùng viện) |
| `assignedNurseId` | UUID | Có | ID Điều dưỡng hỗ trợ (Role: `NURSE`, cùng viện) |
| `assignedExpertId` | UUID | Tùy chọn | ID Bác sĩ Chuyên gia (Bắt buộc nếu gói `VIP`) |

```json
{
  "assignedDoctorId": "doc-uuid-1",
  "assignedNurseId": "nurse-uuid-1",
  "assignedExpertId": "expert-uuid-1"
}
```

---

### 10. Thay đổi Nhân sự Care Team khi Đổi ca / Nghỉ phép (Admin CMS)
- **Method**: `PATCH`
- **Path**: `/care-subscriptions/:id/care-team`
- **Quyền**: `StaffAuthGuard` (`ADMIN`)
- **Input (Body - `UpdateCareTeamDto`)**: `assignedDoctorId`, `assignedNurseId`, `assignedExpertId`

---

### 11. Hủy Gói Đăng Ký (Admin CMS)
- **Method**: `POST`
- **Path**: `/care-subscriptions/:id/cancel`
- **Quyền**: `StaffAuthGuard` (`ADMIN`)

---

### 12. Xóa mềm Lượt Đăng Ký (Admin CMS)
- **Method**: `DELETE`
- **Path**: `/care-subscriptions/:id`
- **Quyền**: `StaffAuthGuard` (`ADMIN`)

