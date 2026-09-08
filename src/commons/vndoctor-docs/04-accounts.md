# 04. Module Accounts (Tài khoản Bệnh nhân App)

## 📌 Tổng quan
Module `accounts` quản lý tài khoản người dùng đăng nhập trên Mobile App. Mỗi tài khoản định danh bằng số điện thoại (`phoneNumber`) và có thể sở hữu nhiều hồ sơ sức khỏe (`health_profiles`) cho các thành viên trong gia đình.

---

## 🚀 Danh sách API

### 1. Xem thông tin tài khoản hiện tại (App)
- **Method**: `GET`
- **Path**: `/accounts/me`
- **Quyền**: `AppAuthGuard`
- **Mô tả**: Bệnh nhân lấy thông tin tài khoản của chính mình.

#### 📤 Output (200 OK)
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "phoneNumber": "0987654321",
  "email": "patient@example.com",
  "isActive": true,
  "createdAt": "2026-09-08T07:00:00.000Z"
}
```

---

### 2. Cập nhật thông tin tài khoản (App)
- **Method**: `PATCH`
- **Path**: `/accounts/me`
- **Quyền**: `AppAuthGuard`

#### 📥 Input (Body)
```json
{
  "email": "new_email@example.com"
}
```

---

### 3. Tra cứu danh sách tài khoản (CMS Admin)
- **Method**: `GET`
- **Path**: `/accounts`
- **Quyền**: `StaffAuthGuard` (`ADMIN`)
- **Input (Query)**: `search`, `isActive`, `page`, `limit`
