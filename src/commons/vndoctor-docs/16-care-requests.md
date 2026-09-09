# 16. Module Care Requests (Yêu Cầu Chăm Sóc Y Tế & Chuyển Ca)

## 📌 Tổng quan
Module `care-requests` đóng vai trò là kênh tiếp nhận và xử lý sự cố y khoa nhanh giữa Bệnh nhân và Care Team:
1. **Bệnh nhân gửi yêu cầu (App Mobile)**: Khi đang có gói `ACTIVE`, bệnh nhân gửi triệu chứng bất thường, câu hỏi dùng thuốc hoặc ảnh tổn thương $\rightarrow$ Tự động gán Điều dưỡng tiếp nhận tầng 1 và bắn tin nhắn vào phòng chat nhóm.
2. **Quy trình Chuyển ca (Escalation Flow)**:
   - Điều dưỡng trực tiếp nhận và xử lý các hướng dẫn thông thường.
   - Nếu phát hiện dấu hiệu nguy hiểm/vượt thẩm quyền $\rightarrow$ Bấm nút **Chuyển ca (`Escalate / Re-assign`)** sang Bác sĩ phụ trách kèm ghi chú.
3. **Bác sĩ kết luận y khoa (`Resolve`)**: Bác sĩ nhập `resolutionNote` (kết luận/chỉ định) $\rightarrow$ chuyển `RESOLVED` và tự động đồng bộ kết quả vào phòng chat Care Team.

---

## 🚀 Danh sách API

### 1. Bệnh nhân Tạo Yêu cầu Hỗ trợ Mới (App Mobile)
- **Method**: `POST`
- **Path**: `/care-requests`
- **Quyền**: `AppAuthGuard`

#### 📥 Input (Body - `CreateCareRequestDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `subscriptionId` | UUID | Có | ID gói chăm sóc đang `ACTIVE` |
| `title` | string | Có | Tiêu đề tóm tắt (5 - 255 ký tự) |
| `description` | string | Không | Mô tả chi tiết triệu chứng |
| `mediaUrls` | string[] | Không | Mảng URL hình ảnh đính kèm (đơn thuốc, vết thương...) |

*Ví dụ Body:*
```json
{
  "subscriptionId": "sub-uuid-1",
  "title": "Cảm thấy tức ngực sau khi uống thuốc huyết áp",
  "description": "Tôi uống thuốc lúc 8h sáng, đến 10h thấy hồi hộp và choáng váng.",
  "mediaUrls": ["https://storage.vndoctor.vn/prescriptions/img-001.jpg"]
}
```

#### 📤 Output (201 Created)
```json
{
  "id": "req-uuid-1",
  "requestCode": "REQ-20260908-AB12",
  "facilityId": "facility-uuid-1",
  "subscriptionId": "sub-uuid-1",
  "assignedUserId": "nurse-uuid-1",
  "status": "PENDING",
  "title": "Cảm thấy tức ngực sau khi uống thuốc huyết áp",
  "description": "Tôi uống thuốc lúc 8h sáng, đến 10h thấy hồi hộp và choáng váng.",
  "mediaUrls": ["https://storage.vndoctor.vn/prescriptions/img-001.jpg"],
  "createdAt": "2026-09-08T10:00:00.000Z"
}
```

---

### 2. Bệnh nhân xem Lịch sử Yêu cầu của mình (App Mobile)
- **Method**: `GET`
- **Path**: `/care-requests/me`
- **Quyền**: `AppAuthGuard`

---

### 3. CMS Nhân viên Y tế xem Danh sách Yêu cầu cần xử lý
- **Method**: `GET`
- **Path**: `/care-requests`
- **Quyền**: `StaffAuthGuard`
- **Input (Query - `QueryCareRequestDto`)**:
  - `facilityId`: Lọc theo cơ sở y tế
  - `subscriptionId`: Lọc theo gói
  - `assignedUserId`: Lọc theo người xử lý
  - `status`: `PENDING` | `IN_PROGRESS` | `RESOLVED` | `CANCELLED`
  - `search`: Tìm theo mã hoặc tiêu đề
  - `page`, `limit`

---

### 4. Chi tiết Yêu cầu Chăm sóc
- **Method**: `GET`
- **Path**: `/care-requests/:id`
- **Quyền**: `StaffAuthGuard` / `AppAuthGuard`

---

### 5. Tiếp nhận Ca / Chuyển Ca sang Bác sĩ (Escalate)
- **Method**: `PATCH`
- **Path**: `/care-requests/:id/assign`
- **Quyền**: `StaffAuthGuard` (`ADMIN`, `DOCTOR`, `NURSE`)

#### 📥 Input (Body - `AssignCareRequestDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `assignedUserId` | UUID | Có | ID Bác sĩ hoặc Điều dưỡng nhận xử lý |
| `note` | string | Không | Ghi chú bàn giao ca / lý do chuyển tuyến |

*Ví dụ Body:*
```json
{
  "assignedUserId": "doctor-uuid-1",
  "note": "Điều dưỡng đã kiểm tra huyết áp 165/100, nghi ngờ tác dụng phụ thuốc, chuyển BS. An xử lý."
}
```

---

### 6. Bác sĩ / Điều dưỡng Chốt Kết luận Y tế & Hoàn tất (Resolve)
- **Method**: `POST`
- **Path**: `/care-requests/:id/resolve`
- **Quyền**: `StaffAuthGuard` (`DOCTOR`, `NURSE`, `ADMIN`)

#### 📥 Input (Body - `ResolveCareRequestDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `resolutionNote` | string | Có | Nội dung kết luận y khoa, lời dặn hoặc chỉ định điều trị |

*Ví dụ Body:*
```json
{
  "resolutionNote": "Bệnh nhân tạm ngưng liều thuốc buổi trưa, uống nhiều nước ấm và đo lại huyết áp sau 1 giờ. Nếu HA > 160 liên hệ lại ngay."
}
```

#### 📤 Output (200 OK)
```json
{
  "id": "req-uuid-1",
  "requestCode": "REQ-20260908-AB12",
  "status": "RESOLVED",
  "resolutionNote": "Bệnh nhân tạm ngưng liều thuốc buổi trưa...",
  "resolvedAt": "2026-09-08T10:30:00.000Z",
  "updatedAt": "2026-09-08T10:30:00.000Z"
}
```
