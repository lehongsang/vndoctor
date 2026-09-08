# 05. Module Health Profiles (Hồ sơ Sức khỏe)

## 📌 Tổng quan
Module `health-profiles` quản lý các hồ sơ sức khỏe cá nhân và người thân. Một tài khoản App có thể quản lý nhiều hồ sơ sức khỏe với các mối quan hệ (`relationship`):
- `SELF`: Bản thân chủ tài khoản
- `FATHER`: Bố
- `MOTHER`: Mẹ
- `CHILD`: Con
- `SPOUSE`: Vợ / Chồng
- `OTHER`: Người thân khác

---

## 🚀 Danh sách API

### 1. Tạo mới Hồ sơ sức khỏe (App)
- **Method**: `POST`
- **Path**: `/health-profiles`
- **Quyền**: `AppAuthGuard`

#### 📥 Input (Body - `CreateHealthProfileDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `relationship` | enum | Có | `SELF`, `FATHER`, `MOTHER`, `CHILD`, `SPOUSE`, `OTHER` |
| `fullName` | string | Có | Họ và tên |
| `dob` | string (YYYY-MM-DD) | Có | Ngày sinh |
| `gender` | enum | Có | `MALE`, `FEMALE`, `OTHER` |
| `citizenId` | string | Không | CCCD 12 số |
| `phoneNumber` | string | Không | SĐT liên hệ riêng của hồ sơ |
| `address` | string | Không | Địa chỉ thường trú |
| `bloodType` | enum | Không | `A`, `B`, `AB`, `O`, `UNKNOWN` |
| `allergy` | string | Không | Tiền sử dị ứng thuốc, thức ăn |
| `medicalHistory`| string | Không | Tiền sử bệnh lý bản thân & gia đình |

*Ví dụ Body:*
```json
{
  "relationship": "SELF",
  "fullName": "Trần Văn An",
  "dob": "1975-05-12",
  "gender": "MALE",
  "citizenId": "048075001234",
  "phoneNumber": "0987654321",
  "address": "Phường Hải Châu 1, Hải Châu, Đà Nẵng",
  "bloodType": "O",
  "allergy": "Dị ứng Penicillin",
  "medicalHistory": "Gia đình có tiền sử Đột quỵ não"
}
```

#### 📤 Output (201 Created)
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "accountId": "acc-uuid",
  "relationship": "SELF",
  "fullName": "Trần Văn An",
  "dob": "1975-05-12",
  "gender": "MALE",
  "bloodType": "O",
  "createdAt": "2026-09-08T07:00:00.000Z"
}
```

---

### 2. Danh sách Hồ sơ sức khỏe của tôi (App)
- **Method**: `GET`
- **Path**: `/health-profiles/my-profiles`
- **Quyền**: `AppAuthGuard`

#### 📤 Output (200 OK)
Trả về mảng danh sách các hồ sơ sức khỏe thuộc tài khoản của người dùng.

---

### 3. Xem chi tiết / Cập nhật Hồ sơ sức khỏe
- **Xem chi tiết**: `GET /health-profiles/:id` (`AppAuthGuard` / `StaffAuthGuard`)
- **Cập nhật**: `PATCH /health-profiles/:id` (`AppAuthGuard` / `StaffAuthGuard`)
