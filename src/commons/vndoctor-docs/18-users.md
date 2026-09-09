# 18. Module Users (Quản lý Thông tin Tài khoản & Avatar Hệ thống)

## 📌 Tổng quan
Module `users` phục vụ quản lý hồ sơ cá nhân của người dùng trên nền tảng (bao gồm CMS Admin, Staff và các tài khoản quản trị hệ thống), hỗ trợ cập nhật thông tin họ tên, số điện thoại, tải lên và quản lý ảnh đại diện (Avatar) thông qua dịch vụ lưu trữ AWS S3 với Presigned URLs.

---

## 🚀 Danh sách API

### 1. Lấy thông tin cá nhân của tài khoản đang đăng nhập
- **Method**: `GET`
- **Path**: `/users/me`
- **Quyền**: `ALL_ROLES` (Yêu cầu đăng nhập tài khoản hệ thống)
- **Mô tả**: Trả về chi tiết tài khoản của người dùng hiện tại kèm đường dẫn URL avatar (Presigned URL từ S3).

#### 📤 Output (200 OK)
```json
{
  "id": "e30f1b2b-63a2-4bb3-9366-218a56ee19d2",
  "name": "Dr. Nguyễn Văn A",
  "email": "doctor@vndoctor.vn",
  "phoneNumber": "0988123456",
  "role": "ADMIN",
  "mediaId": "f78a2c11-789a-4e2b-a5d6-891122334455",
  "media": {
    "id": "f78a2c11-789a-4e2b-a5d6-891122334455",
    "s3Key": "users/avatar/uuid-avatar.png",
    "url": "https://s3.ap-southeast-1.amazonaws.com/vndoctor-bucket/users/avatar/uuid-avatar.png?X-Amz-Signature=..."
  },
  "emailVerified": true,
  "createdAt": "2026-09-08T00:00:00.000Z",
  "updatedAt": "2026-09-08T00:00:00.000Z"
}
```

---

### 2. Cập nhật thông tin cá nhân và Avatar
- **Method**: `PATCH`
- **Path**: `/users/me`
- **Quyền**: `ALL_ROLES`
- **Content-Type**: `multipart/form-data`
- **Mô tả**: Cho phép cập nhật họ tên, số điện thoại và tải lên file ảnh đại diện mới. Khi tải ảnh mới, ảnh cũ sẽ tự động được thu hồi và xóa khỏi S3.

#### 📥 Input (Multipart Form Data)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `name` | `string` | Không | Họ và tên mới |
| `phone` | `string` | Không | Số điện thoại liên hệ |
| `avatar` | `File (Image)` | Không | Tệp hình ảnh đại diện (`jpg`, `jpeg`, `png`, `webp`, tối đa 5MB) |

#### 📤 Output (200 OK)
```json
{
  "id": "e30f1b2b-63a2-4bb3-9366-218a56ee19d2",
  "name": "Dr. Nguyễn Văn A (Trưởng khoa)",
  "email": "doctor@vndoctor.vn",
  "phoneNumber": "0988999888",
  "role": "ADMIN",
  "media": {
    "id": "a90b1c2d-1122-3344-5566-778899aabbcc",
    "url": "https://s3.ap-southeast-1.amazonaws.com/vndoctor-bucket/users/avatar/new-avatar.png?..."
  }
}
```

---

## ⚙️ Logic Khởi tạo Quản trị viên (Admin Seed)
- Khi ứng dụng khởi chạy (`onModuleInit`), `UsersService` tự động kiểm tra tài khoản quản trị hệ thống dựa trên cấu hình môi trường `ADMIN_EMAIL` và `ADMIN_PASSWORD`.
- Nếu tài khoản quản trị chưa tồn tại trong cơ sở dữ liệu, hệ thống tự động khởi tạo tài khoản với quyền `Role.ADMIN` và kích hoạt sẵn `emailVerified = true`.
