# 07. Module Patient Links (Liên kết Bệnh viện - App)

## 📌 Tổng quan
Module `patient-links` quản lý quá trình tìm kiếm và liên kết hồ sơ bệnh nhân tại bệnh viện (`facility_patient_links`) với hồ sơ sức khỏe trên Mobile App:
- `PENDING`: Đang chờ xác nhận
- `ACTIVE`: Đã liên kết thành công
- `UNLINKED`: Đã hủy liên kết

---

## 🚀 Danh sách API

### 1. Tạo mới liên kết Hồ sơ Bệnh viện
- **Method**: `POST`
- **Path**: `/patient-links`
- **Quyền**: `StaffAuthGuard` hoặc `AppAuthGuard`

#### 📥 Input (Body - `CreatePatientLinkDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `facilityId` | UUID | Có | ID cơ sở y tế |
| `healthProfileId` | UUID | Có | ID hồ sơ sức khỏe trên App |
| `phoneNumber` | string | Có | SĐT dùng để liên kết |
| `hospitalPatientCode` | string | Không | Mã bệnh nhân tại viện (nếu có) |
| `status` | enum | Không | `PENDING`, `ACTIVE`, `UNLINKED` (Mặc định: `ACTIVE`) |

*Ví dụ Body:*
```json
{
  "facilityId": "e1112233-4455-6677-8899-aabbccddeeff",
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "phoneNumber": "0987654321",
  "hospitalPatientCode": "BN-2026-00892",
  "status": "ACTIVE"
}
```

#### 📤 Output (201 Created)
```json
{
  "id": "link-uuid",
  "facilityId": "e1112233-4455-6677-8899-aabbccddeeff",
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "phoneNumber": "0987654321",
  "hospitalPatientCode": "BN-2026-00892",
  "status": "ACTIVE",
  "linkedAt": "2026-09-08T07:15:00.000Z",
  "createdAt": "2026-09-08T07:15:00.000Z"
}
```

---

### 2. Danh sách liên kết bệnh viện của tôi (App)
- **Method**: `GET`
- **Path**: `/patient-links/my-links`
- **Quyền**: `AppAuthGuard`
