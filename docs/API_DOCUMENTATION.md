# 📚 VNDOCTOR SYSTEM API DOCUMENTATION

> **Dự án**: VNDoctor Backend Platform  
> **Kiến trúc**: NestJS Clean Architecture, PostgreSQL (TypeORM), Redis, WebSocket (Socket.io), Swagger `/api/docs`

---

## 📑 MỤC LỤC MODULES

1. [Authentication & Staff (`/auth`, `/staff`, `/accounts`)](#1-authentication--users)
2. [Facilities & Patient Links (`/facilities`, `/patient-links`)](#2-facilities--patient-links)
3. [Health Profiles & Chronic Diseases (`/health-profiles`, `/chronic-diseases`)](#3-health-profiles--chronic-diseases)
4. [Health Records & Metrics (`/health-records`)](#4-health-records--personal-metrics)
5. [Risk Assessments & Examinations (`/risk-assessments`, `/examinations`)](#5-risk-assessments--examinations)
6. [Treatment Targets & Plans (`/treatment-dictionaries`, `/treatment-targets`, `/treatment-plans`)](#6-treatment-targets--plans)
7. [Care Packages - Sprint 1 (`/care-packages`)](#7-care-packages-gói-dịch-vụ-chăm-sóc)
8. [Care Subscriptions - Sprint 2 (`/care-subscriptions`)](#8-care-subscriptions-đăng-ký-gói--care-team)
9. [Care Requests - Sprint 3 (`/care-requests`)](#9-care-requests-yêu-cầu-chăm-sóc-y-tế)
10. [Conversations & Realtime Chat - Sprint 4 (`/conversations`, WebSocket `/chat`)](#10-conversations--realtime-chat)

---

## 1. Authentication & Users

### 🔐 1.1. Auth (`/api/v1/auth`)
- `POST /api/v1/auth/staff/login`: Đăng nhập tài khoản Nhân viên y tế (Admin, Doctor, Nurse, Tech). Trả về Staff JWT Token (Role, FacilityId).
- `POST /api/v1/auth/app/login`: Đăng nhập/Đăng ký Bệnh nhân qua SĐT và mật khẩu. Trả về App JWT Token (`type: APP_ACCOUNT`).
- `GET /api/v1/auth/me`: Lấy thông tin tài khoản đang đăng nhập.

### 👥 1.2. Staff Management (`/api/v1/staff`)
- `POST /api/v1/staff`: Tạo tài khoản nhân viên y tế mới (Role: `ADMIN`).
- `GET /api/v1/staff`: Danh sách nhân viên trong cơ sở y tế (Lọc theo role `DOCTOR`, `NURSE`, `ADMIN`, trạng thái hoạt động).
- `GET /api/v1/staff/:id`: Xem chi tiết nhân viên y tế.
- `PATCH /api/v1/staff/:id`: Cập nhật thông tin chuyên khoa, chức danh.
- `PATCH /api/v1/staff/:id/status`: Kích hoạt / Vô hiệu hóa tài khoản nhân viên.

---

## 2. Facilities & Patient Links

### 🏥 2.1. Facilities (`/api/v1/facilities`)
- `POST /api/v1/facilities`: Tạo cơ sở y tế mới.
- `GET /api/v1/facilities`: Danh sách các cơ sở y tế (Bệnh viện tỉnh, huyện, trạm y tế, phòng khám).
- `GET /api/v1/facilities/:id`: Chi tiết cơ sở y tế.
- `PATCH /api/v1/facilities/:id`: Cập nhật thông tin cơ sở.

### 🔗 2.2. Patient Links (`/api/v1/patient-links`)
- `POST /api/v1/patient-links`: Tạo yêu cầu liên kết hồ sơ bệnh nhân với cơ sở y tế qua số điện thoại/mã bệnh viện.
- `GET /api/v1/patient-links`: Danh sách liên kết bệnh nhân của cơ sở.
- `PATCH /api/v1/patient-links/:id/status`: Duyệt/Hủy liên kết hồ sơ.

---

## 3. Health Profiles & Chronic Diseases

### 👤 3.1. Health Profiles (`/api/v1/health-profiles`)
- `POST /api/v1/health-profiles`: Tạo mới hồ sơ sức khỏe cho bản thân (`SELF`) hoặc người thân (`FATHER`, `MOTHER`, `CHILD`, `SPOUSE`...).
- `GET /api/v1/health-profiles/me`: Lấy tất cả hồ sơ sức khỏe thuộc tài khoản app đang đăng nhập.
- `GET /api/v1/health-profiles/:id`: Xem chi tiết hồ sơ (CCCD, ngày sinh, nhóm máu, tiền sử dị ứng).
- `PATCH /api/v1/health-profiles/:id`: Cập nhật thông tin hồ sơ sức khỏe.
- `DELETE /api/v1/health-profiles/:id`: Xóa hồ sơ sức khỏe.

### 🩺 3.2. Chronic Diseases (`/api/v1/chronic-diseases`)
- `GET /api/v1/chronic-diseases`: Danh mục các bệnh mạn tính chuẩn (Tăng huyết áp, Đái tháo đường, Rối loạn lipid máu, Đột quỵ...).
- `POST /api/v1/chronic-diseases/profile/:healthProfileId`: Gán danh sách bệnh nền cho hồ sơ sức khỏe.

---

## 4. Health Records & Personal Metrics

### 📊 Health Records (`/api/v1/health-records`)
- `POST /api/v1/health-records`: Bệnh nhân ghi nhận chỉ số theo dõi (Huyết áp, Nhịp tim, Đường huyết, SpO2, Thân nhiệt, Cân nặng).
- `GET /api/v1/health-records`: Lấy lịch sử đo lường chỉ số (lọc theo khoảng thời gian và loại chỉ số).
- `GET /api/v1/health-records/summary/:healthProfileId`: Tóm tắt các chỉ số đo mới nhất của hồ sơ bệnh nhân.
- `DELETE /api/v1/health-records/:id`: Xóa bản ghi đo lường.

---

## 5. Risk Assessments & Examinations

### ⚡ 5.1. Risk Factor Assessments (`/api/v1/risk-assessments`)
- `POST /api/v1/risk-assessments`: Tạo phiếu đánh giá phân tầng nguy cơ tim mạch và chuyển hóa 10 năm (PTYTNC).
- `GET /api/v1/risk-assessments`: Lấy danh sách các phiếu đánh giá PTYTNC.
- `GET /api/v1/risk-assessments/:id`: Chi tiết phiếu đánh giá kèm điểm SCORE và mức độ nguy cơ (`LOW`, `HIGH`, `VERY_HIGH`).
- `POST /api/v1/risk-assessments/:id/evaluate`: Bác sĩ thẩm định và đưa ra kết luận phân tầng nguy cơ.

### 📋 5.2. Examinations (`/api/v1/examinations`)
- `POST /api/v1/examinations`: Bác sĩ lập phiếu khám bệnh ngoại trú (`EX-YYYYMMDD-XXXX`).
- `GET /api/v1/examinations`: Danh sách phiếu khám có phân trang, lọc theo bác sĩ, bệnh nhân, ngày khám.
- `GET /api/v1/examinations/:id`: Xem chi tiết phiếu khám, chẩn đoán ICD-10, sinh hiệu và hướng điều trị.
- `PATCH /api/v1/examinations/:id`: Chỉnh sửa phiếu khám.
- `PATCH /api/v1/examinations/:id/status`: Hoàn thành hoặc Hủy phiếu khám.

---

## 6. Treatment Targets & Plans

### 📖 6.1. Treatment Dictionaries (`/api/v1/treatment-dictionaries`)
- `GET /api/v1/treatment-dictionaries`: Tra cứu từ điển chuẩn mục tiêu điều trị theo phân tầng (từ mã `A1` đến `G5`).
- `GET /api/v1/treatment-dictionaries/:code`: Xem chi tiết mục tiêu huyết áp, mỡ máu, BMI, chế độ ăn, tập luyện theo mã.

### 🎯 6.2. Patient Treatment Targets (`/api/v1/treatment-targets`)
- `POST /api/v1/treatment-targets`: Thiết lập mục tiêu điều trị cá thể hóa cho bệnh nhân.
- `GET /api/v1/treatment-targets`: Danh sách mục tiêu điều trị.
- `POST /api/v1/treatment-targets/:id/verify`: Bác sĩ xác nhận mục tiêu điều trị (`DOCTOR_VERIFIED`).

### 🗺️ 6.3. Treatment Plans (`/api/v1/treatment-plans`)
- `POST /api/v1/treatment-plans`: Tạo phác đồ quản lý và kế hoạch điều trị mạn tính (`TP-YYYYMMDD-XXXX`).
- `GET /api/v1/treatment-plans`: Danh sách phác đồ theo hồ sơ bệnh nhân.
- `PATCH /api/v1/treatment-plans/:id/status`: Cập nhật trạng thái phác đồ (`ACTIVE`, `COMPLETED`, `DISCONTINUED`).

---

## 7. Care Packages (Gói Dịch Vụ Chăm Sóc)

- **Module**: `src/modules/care-packages/`
- **Thực thể**: `CarePackage` (`care_packages`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/care-packages` | `Staff (ADMIN)` | Tạo mới gói chăm sóc sức khỏe (Tiêu chuẩn/VIP, thời hạn ngày, giá niêm yết, quyền lợi). |
| `GET` | `/api/v1/care-packages` | `Public` | Danh sách gói chăm sóc (Phân trang, lọc theo `facilityId`, `type`, `status`). |
| `GET` | `/api/v1/care-packages/:id` | `Public` | Xem chi tiết gói chăm sóc sức khỏe. |
| `PATCH` | `/api/v1/care-packages/:id` | `Staff (ADMIN)` | Cập nhật thông tin gói chăm sóc. |
| `PATCH` | `/api/v1/care-packages/:id/status` | `Staff (ADMIN)` | Bật / tắt trạng thái hoạt động của gói (`ACTIVE`/`INACTIVE`). |

---

## 8. Care Subscriptions (Đăng Ký Gói & Care Team)

- **Module**: `src/modules/care-subscriptions/`
- **Thực thể**: `PatientCareSubscription` (`patient_care_subscriptions`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/care-subscriptions` | `App Account` | Bệnh nhân đăng ký gói cho hồ sơ của mình $\rightarrow$ Sinh bản ghi ở trạng thái **`PENDING`**. |
| `GET` | `/api/v1/care-subscriptions/me` | `App Account` | Danh sách tất cả các gói dịch vụ đã đăng ký của bệnh nhân. |
| `GET` | `/api/v1/care-subscriptions` | `Staff` | CMS xem danh sách đăng ký theo viện, lọc theo `PENDING`/`ACTIVE`, bác sĩ, điều dưỡng. |
| `GET` | `/api/v1/care-subscriptions/:id` | `Staff / Patient` | Chi tiết gói đăng ký kèm danh sách Care Team (Bác sĩ, Y tá, Chuyên gia). |
| `POST` | `/api/v1/care-subscriptions/:id/assign-and-activate` | `Staff (ADMIN/DOCTOR)` | **Phân công Care Team & Kích hoạt gói**: Tự động tính `startedAt`, `expiresAt`, chuyển `ACTIVE`, và tự động sinh phòng chat nhóm `CARE_TEAM`. |
| `PATCH` | `/api/v1/care-subscriptions/:id/care-team` | `Staff (ADMIN)` | Đổi Bác sĩ / Y tá phụ trách khi có chuyển ca trực hoặc nghỉ phép. |
| `POST` | `/api/v1/care-subscriptions/:id/cancel` | `Staff (ADMIN)` | Hủy gói đăng ký (`CANCELLED`). |

---

## 9. Care Requests (Yêu Cầu Chăm Sóc Y Tế)

- **Module**: `src/modules/care-requests/`
- **Thực thể**: `PatientCareRequest` (`patient_care_requests`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/care-requests` | `App Account` | Bệnh nhân gửi triệu chứng/ảnh đính kèm khi gói đang `ACTIVE` $\rightarrow$ Tự động gán Điều dưỡng và đồng bộ tin nhắn vào phòng chat. |
| `GET` | `/api/v1/care-requests/me` | `App Account` | Bệnh nhân xem lịch sử các yêu cầu đã gửi. |
| `GET` | `/api/v1/care-requests` | `Staff` | Danh sách yêu cầu cần xử lý tại cơ sở y tế (lọc theo `PENDING`, `IN_PROGRESS`, `RESOLVED`). |
| `GET` | `/api/v1/care-requests/:id` | `Staff / Patient` | Xem chi tiết yêu cầu kèm hình ảnh và lịch sử kết luận. |
| `PATCH` | `/api/v1/care-requests/:id/assign` | `Staff (ADMIN/DOCTOR/NURSE)` | **Tiếp nhận ca / Chuyển ca (Escalate)**: Điều dưỡng tiếp nhận hoặc chuyển tiếp cho Bác sĩ xử lý. |
| `PATCH` | `/api/v1/care-requests/:id/status` | `Staff` | Cập nhật trạng thái (`IN_PROGRESS`, `CANCELLED`). |
| `POST` | `/api/v1/care-requests/:id/resolve` | `Staff (DOCTOR/NURSE)` | **Bác sĩ kết luận y khoa**: Lưu `resolutionNote`, chuyển `RESOLVED`, và tự động bắn kết luận vào phòng chat nhóm. |

---

## 10. Conversations & Realtime Chat

- **Module**: `src/modules/conversations/`
- **Thực thể**: `Conversation` (`conversations`), `Message` (`messages`)
- **WebSocket Gateway**: Namespace `/chat` (Socket.io)

### 💬 10.1. REST API Endpoints
| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/conversations/me` | `App Account` | Lấy danh sách nhóm chat Care Team và chat 1-1 của bệnh nhân. |
| `GET` | `/api/v1/conversations` | `Staff` | Lấy danh sách phòng chat thuộc cơ sở y tế kèm tin nhắn mới nhất. |
| `POST` | `/api/v1/conversations/direct` | `App Account` | Khởi tạo / Mở phòng chat trực tiếp 1-1 với Bác sĩ. |
| `GET` | `/api/v1/conversations/:id` | `Staff / Patient` | Chi tiết thông tin phòng chat và thành viên. |
| `GET` | `/api/v1/conversations/:id/messages` | `Staff / Patient` | Lấy lịch sử tin nhắn trong phòng chat (Cursor pagination với tham số `before`). |
| `POST` | `/api/v1/conversations/:id/messages` | `Staff / Patient` | Gửi tin nhắn qua REST API (hỗ trợ kèm ảnh, đính kèm thẻ y tế `resourceId`). |
| `PATCH` | `/api/v1/conversations/messages/:id/pin` | `Staff` | Ghim / Bỏ ghim tin nhắn quan trọng trong phòng chat. |
| `DELETE` | `/api/v1/conversations/messages/:id` | `Staff / Patient` | Thu hồi tin nhắn (`isDeleted = true`). |

### ⚡ 10.2. Realtime WebSocket Events (`/chat`)

#### Kết nối Handshake
```javascript
import { io } from 'socket.io-client';

const socket = io('https://api.vndoctor.vn/chat', {
  auth: {
    token: 'Bearer <JWT_TOKEN>' // Token của Bệnh nhân hoặc Bác sĩ
  }
});
```

#### Danh sách Client Events (Client gửi lên Server):
- `join_room` `{ conversationId: "uuid" }`: Tham gia lắng nghe sự kiện của một phòng chat.
- `leave_room` `{ conversationId: "uuid" }`: Rời khỏi phòng chat.
- `send_message` `{ conversationId, content, messageType, resourceId, mediaUrl, replyToMessageId }`: Gửi tin nhắn realtime $\rightarrow$ Server lưu DB và broadcast đến mọi người trong room.
- `typing` `{ conversationId, isTyping: true/false }`: Báo hiệu đang gõ tin nhắn.
- `message_read` `{ conversationId, messageId }`: Đánh dấu đã đọc tin nhắn.

#### Danh sách Server Broadcasts (Server bắn về Client):
- `new_message`: Nhận tin nhắn mới vừa được gửi vào phòng chat.
- `user_typing`: Nhận tín hiệu người dùng đang gõ tin nhắn.
- `message_read_receipt`: Nhận thông báo đối phương đã đọc tin nhắn.
