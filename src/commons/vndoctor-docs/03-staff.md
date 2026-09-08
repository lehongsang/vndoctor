# 03. Module Staff (Nhân viên & Bác sĩ CMS)

## 📌 Tổng quan
Module `staff` quản lý hồ sơ nhân viên y tế, bác sĩ và phân quyền các vai trò trong bệnh viện:
- `ADMIN`: Quản trị viên cơ sở y tế
- `DOCTOR`: Bác sĩ điều trị / khám bệnh
- `NURSE`: Điều dưỡng viên
- `TECHNICIAN`: Kỹ thuật viên xét nghiệm / CĐHA
- `STAFF`: Nhân viên hành chính / tiếp đón

---

## 🚀 Danh sách API

### 1. Tạo mới Bác sĩ / Nhân viên (Admin)
- **Method**: `POST`
- **Path**: `/staff`
- **Quyền**: `StaffAuthGuard` (`ADMIN`)
- **Mô tả**: Tạo tài khoản cho nhân viên y tế mới gắn liền với cơ sở y tế.

#### 📥 Input (Body - `CreateStaffUserDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `facilityId` | UUID | Có | ID cơ sở y tế công tác |
| `staffCode` | string | Có | Mã nhân viên / Số CCHN (Unique) |
| `username` | string | Có | Tên đăng nhập CMS (Unique) |
| `password` | string | Có | Mật khẩu khởi tạo |
| `fullName` | string | Có | Họ và tên nhân viên |
| `role` | enum | Có | `ADMIN`, `DOCTOR`, `NURSE`, `TECHNICIAN`, `STAFF` |
| `email` | string | Có | Email liên hệ (bắt buộc) |
| `specialty` | string | Không | Chuyên khoa (VD: Tim mạch, Nội tiết) |
| `phoneNumber`| string | Không | Số điện thoại |

*Ví dụ Body:*
```json
{
  "facilityId": "e1112233-4455-6677-8899-aabbccddeeff",
  "staffCode": "CCHN-08991",
  "username": "doctor_lan",
  "password": "Password@123",
  "fullName": "BS. Nguyễn Văn Lan",
  "role": "DOCTOR",
  "specialty": "Tim mạch Can thiệp",
  "email": "doctor_lan@bvdanang.vn",
  "phoneNumber": "0912345678"
}
```

#### 📤 Output (201 Created)
```json
{
  "id": "f901ab23-1122-3344-5566-778899aabbcc",
  "facilityId": "e1112233-4455-6677-8899-aabbccddeeff",
  "staffCode": "CCHN-08991",
  "username": "doctor_lan",
  "fullName": "BS. Nguyễn Văn Lan",
  "role": "DOCTOR",
  "specialty": "Tim mạch Can thiệp",
  "email": "doctor_lan@bvdanang.vn",
  "phoneNumber": "0912345678",
  "isActive": true,
  "createdAt": "2026-09-08T00:00:00.000Z"
}
```

---

### 2. Danh sách Nhân viên y tế
- **Method**: `GET`
- **Path**: `/staff`
- **Quyền**: `StaffAuthGuard`
- **Input (Query)**: `facilityId`, `role`, `search`, `isActive`, `page`, `limit`

---

### 3. Xem chi tiết thông tin Nhân viên
- **Method**: `GET`
- **Path**: `/staff/:id`
- **Quyền**: `StaffAuthGuard`
