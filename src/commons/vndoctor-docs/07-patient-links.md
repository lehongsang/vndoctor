# 07. Module Patient Links (Liên kết Cơ sở Y tế - App Bệnh nhân)

## 📌 Tổng quan
Module `patient-links` quản lý toàn bộ quy trình gửi yêu cầu liên kết, xác nhận và hủy liên kết giữa **Cơ sở Y tế (Bệnh viện/Phòng khám)** và **Tài khoản Ứng dụng Di động (App Account)** của bệnh nhân.

### 🔹 Ma trận Trạng thái:
| Tình huống | `accountId` | `facilityId` | `isLinked` | `linkStatus` | Giải thích |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Bệnh nhân tạo hồ sơ trên App** | Có `UUID` | `null` | `false` | `NOT_LINKED` | Chưa kết nối CSYT |
| **CSYT tạo hồ sơ tại viện** | `null` | Có `UUID` | `false` | `NOT_LINKED` | Chưa kết nối tài khoản App |
| **CSYT gửi request liên kết** | `null` / Chờ match | Có `UUID` | `false` | **`PENDING`** | Phát SSE lời mời sang App |
| **Bệnh nhân bấm "Đồng ý"** | Có `UUID` | Có `UUID` | **`true`** | **`ACTIVE`** | **Liên kết thành công 2 chiều** |
| **Từ chối / Hủy liên kết** | Có `UUID` | Giữ / `null` | `false` | **`UNLINKED`** | Ngắt kết nối |

---

## 🚀 Danh sách API

### 1. CSYT gửi yêu cầu liên kết đến App bệnh nhân qua SĐT (Staff Auth)
- **Method**: `POST`
- **Path**: `/patient-links/request`
- **Quyền**: `StaffAuthGuard`
- **Mô tả**: Bệnh viện gửi yêu cầu liên kết hồ sơ bệnh nhân tới tài khoản App qua SĐT. Hệ thống cập nhật `linkStatus = 'PENDING'`, `isLinked = false` và phát sự kiện **SSE real-time** tới App.

#### 📥 Input Body (`RequestPatientLinkDto`)
```json
{
  "healthProfileId": "01a0b123-4567-89ab-cdef-0123456789ab",
  "phoneNumber": "0987654321"
}
```

---

### 2. Bệnh nhân xem danh sách lời mời chờ duyệt trên App (App Auth)
- **Method**: `GET`
- **Path**: `/patient-links/my-invitations`
- **Quyền**: `AppAuthGuard`
- **Mô tả**: Trả về danh sách các hồ sơ đang có lời mời liên kết từ bệnh viện (`linkStatus = 'PENDING'`).

---

### 3. Bệnh nhân chấp nhận lời mời liên kết (App Auth)
- **Method**: `PATCH`
- **Path**: `/patient-links/invitations/:id/accept`
- **Param**: `:id` là UUID của hồ sơ sức khỏe (`healthProfileId`).
- **Quyền**: `AppAuthGuard`
- **Hành vi**: Gán `accountId = account.id`, chuyển `isLinked = true`, `linkStatus = 'ACTIVE'`, phát SSE cập nhật trạng thái.

---

### 4. Bệnh nhân từ chối lời mời liên kết (App Auth)
- **Method**: `PATCH`
- **Path**: `/patient-links/invitations/:id/reject`
- **Param**: `:id` là UUID của hồ sơ sức khỏe (`healthProfileId`).
- **Quyền**: `AppAuthGuard`
- **Hành vi**: Chuyển `isLinked = false`, `linkStatus = 'UNLINKED'`.

---

### 5. Danh sách cơ sở y tế đã liên kết của bệnh nhân (App Auth)
- **Method**: `GET`
- **Path**: `/patient-links/my-links`
- **Quyền**: `AppAuthGuard`
- **Mô tả**: Trả về các hồ sơ đã liên kết thành công (`isLinked = true` và `linkStatus = 'ACTIVE'`).

---

### 6. Cập nhật Mã bệnh nhân hoặc Trạng thái liên kết (Staff Auth)
- **Method**: `PATCH`
- **Path**: `/patient-links/:id`
- **Param**: `:id` là UUID của hồ sơ sức khỏe.
- **Quyền**: `StaffAuthGuard`

#### 📥 Input Body (`UpdatePatientLinkDto`)
```json
{
  "hospitalPatientCode": "BN-2026-00123",
  "status": "ACTIVE"
}
```

---

### 7. Hủy liên kết hồ sơ khỏi Cơ sở Y tế (Staff Auth)
- **Method**: `DELETE`
- **Path**: `/patient-links/:facilityId/:healthProfileId`
- **Quyền**: `StaffAuthGuard`
- **Hành vi**: Chuyển `isLinked = false`, `linkStatus = 'UNLINKED'`.
