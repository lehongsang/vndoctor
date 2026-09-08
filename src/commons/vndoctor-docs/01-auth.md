# 01. Module Auth (Xác thực & Phân quyền)

## 📌 Tổng quan
Module `auth` cung cấp cơ chế xác thực kép (Dual Authentication):
1. **Staff Auth (`StaffAuthGuard`)**: Dành cho Bác sĩ, Nhân viên y tế và Quản trị viên trên Web CMS.
2. **App Auth (`AppAuthGuard`)**: Dành cho Bệnh nhân / Người dùng trên Ứng dụng di động (Mobile App).

---

## 🚀 Danh sách API

### 1. Đăng nhập Bác sĩ / Nhân viên CMS
- **Method**: `POST`
- **Path**: `/auth/staff/login`
- **Quyền**: Public
- **Mô tả**: Bác sĩ/Nhân viên đăng nhập bằng username và mật khẩu để nhận Bearer Token CMS.

#### 📥 Input (Body - `StaffLoginDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `username` | string | Có | Tên đăng nhập |
| `password` | string | Có | Mật khẩu tài khoản |

*Ví dụ Body:*
```json
{
  "username": "doctor_lan",
  "password": "Password@123"
}
```

#### 📤 Output (200 OK - `StaffAuthResponseDto`)
```json
{
  "tokenType": "Bearer",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "staff": {
    "id": "f901ab23-1122-3344-5566-778899aabbcc",
    "facilityId": "e1112233-4455-6677-8899-aabbccddeeff",
    "staffCode": "CCHN-08991",
    "username": "doctor_lan",
    "fullName": "BS. Nguyễn Văn Lan",
    "role": "DOCTOR",
    "specialty": "Tim mạch Can thiệp",
    "email": "doctor_lan@bvdanang.vn",
    "phoneNumber": "0912345678"
  }
}
```

---

### 2. Đăng ký Tài khoản Bệnh nhân App
- **Method**: `POST`
- **Path**: `/auth/app/register`
- **Quyền**: Public
- **Mô tả**: Bệnh nhân đăng ký tài khoản App mới bằng số điện thoại.

#### 📥 Input (Body - `AppRegisterDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `phoneNumber` | string | Có | Số điện thoại (9-15 số) |
| `password` | string | Có | Mật khẩu (tối thiểu 6 ký tự) |
| `email` | string | Không | Email bệnh nhân |

*Ví dụ Body:*
```json
{
  "phoneNumber": "0987654321",
  "password": "Password@123",
  "email": "patient@example.com"
}
```

#### 📤 Output (201 Created - `AppAuthResponseDto`)
```json
{
  "tokenType": "Bearer",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "account": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "phoneNumber": "0987654321",
    "email": "patient@example.com",
    "isActive": true
  }
}
```

---

### 3. Đăng nhập Tài khoản Bệnh nhân App
- **Method**: `POST`
- **Path**: `/auth/app/login`
- **Quyền**: Public
- **Mô tả**: Bệnh nhân đăng nhập vào App bằng SĐT và mật khẩu.

#### 📥 Input (Body - `AppLoginDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `phoneNumber` | string | Có | Số điện thoại đăng ký |
| `password` | string | Có | Mật khẩu |

*Ví dụ Body:*
```json
{
  "phoneNumber": "0987654321",
  "password": "Password@123"
}
```

#### 📤 Output (200 OK)
Trạng thái trả về cấu trúc tương tự API đăng ký App (`AppAuthResponseDto`).
