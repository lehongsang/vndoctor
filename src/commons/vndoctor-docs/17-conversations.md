# 17. Module Conversations & Realtime Chat (Hội Thoại & Nhắn Tin Y Tế)

## 📌 Tổng quan
Module `conversations` cung cấp nền tảng liên lạc trực tuyến giữa Bệnh nhân và Đội ngũ Y tế:
1. **Phân loại Hội thoại**:
   - `CARE_TEAM`: Nhóm chat chăm sóc liên kết với gói subscription của bệnh nhân (gồm Bác sĩ, Y tá, Chuyên gia và Bệnh nhân).
   - `DIRECT`: Hội thoại trực tiếp 1-1 giữa Bác sĩ và Bệnh nhân.
2. **Loại tin nhắn hỗ trợ**:
   - `TEXT`: Văn bản thường.
   - `IMAGE` / `FILE`: Hình ảnh, đơn thuốc, tài liệu y tế.
   - `EXAMINATION`: Thẻ liên kết Phiếu khám bệnh.
   - `RISK_ASSESSMENT`: Thẻ liên kết Phiếu phân tầng nguy cơ (PTYTNC).
   - `HEALTH_RECORD`: Thẻ liên kết Chỉ số đo sinh hiệu.
   - `CARE_REQUEST`: Thẻ liên kết Yêu cầu chăm sóc y tế.
   - `SYSTEM`: Tin nhắn hệ thống (Chào mừng, Thông báo chuyển ca, Kết luận).
3. **Kênh truyền tải kép**:
   - REST API: Quản lý phòng chat, lịch sử tin nhắn phân trang (Cursor pagination), ghim/thu hồi tin nhắn.
   - WebSocket Gateway (`/chat`): Trao đổi tin nhắn thời gian thực (Socket.io), sự kiện gõ phím (`typing`), xác nhận đã đọc (`read receipt`).

---

## 🚀 1. Danh sách REST API

### 1. Bệnh nhân lấy Danh sách Phòng Chat của mình (App)
- **Method**: `GET`
- **Path**: `/conversations/me`
- **Quyền**: `AppAuthGuard`
- **Input (Query - `QueryConversationDto`)**: `type`, `status`, `search`, `page`, `limit`

---

### 2. Nhân viên y tế xem Danh sách Phòng Chat tại Viện (CMS)
- **Method**: `GET`
- **Path**: `/conversations`
- **Quyền**: `StaffAuthGuard`
- **Input (Query - `QueryConversationDto`)**: `facilityId`, `type`, `status`, `search`, `page`, `limit`

---

### 3. Mở Phòng Chat Trực Tiếp 1-1 với Bác sĩ
- **Method**: `POST`
- **Path**: `/conversations/direct`
- **Quyền**: `AppAuthGuard`

#### 📥 Input (Body - `CreateDirectConversationDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `healthProfileId` | UUID | Có | ID hồ sơ sức khỏe bệnh nhân |
| `directUserId` | UUID | Có | ID Bác sĩ chỉ định |

*Ví dụ Body:*
```json
{
  "healthProfileId": "profile-uuid-1",
  "directUserId": "doctor-uuid-1"
}
```

---

### 4. Xem Chi tiết Phòng Chat
- **Method**: `GET`
- **Path**: `/conversations/:id`
- **Quyền**: `StaffAuthGuard` / `AppAuthGuard`

---

### 5. Lấy Lịch sử Tin nhắn trong Phòng Chat
- **Method**: `GET`
- **Path**: `/conversations/:id/messages`
- **Quyền**: `StaffAuthGuard` / `AppAuthGuard`
- **Input (Query - `QueryMessageDto`)**:
  - `page`: Trang
  - `limit`: Số tin nhắn trên trang (Mặc định: 30)
  - `before`: Thời điểm mốc thời gian để lấy các tin nhắn cũ hơn (Cursor)

---

### 6. Gửi Tin nhắn qua REST API
- **Method**: `POST`
- **Path**: `/conversations/:id/messages`
- **Quyền**: `StaffAuthGuard` / `AppAuthGuard`

#### 📥 Input (Body - `SendMessageDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `content` | string | Có | Nội dung tin nhắn văn bản |
| `messageType` | enum | Không | `TEXT`, `IMAGE`, `FILE`, `EXAMINATION`, `CARE_REQUEST`... |
| `resourceId` | UUID | Không | ID thực thể y tế liên kết |
| `mediaUrl` | string | Không | URL hình ảnh / file đính kèm |
| `replyToMessageId` | UUID | Không | ID tin nhắn được trả lời |

*Ví dụ Body:*
```json
{
  "content": "Bác sĩ xem giúp tôi kết quả đo huyết áp sáng nay",
  "messageType": "HEALTH_RECORD",
  "resourceId": "record-uuid-1",
  "mediaUrl": "https://storage.vndoctor.vn/chat/bp-chart.png"
}
```

---

### 7. Ghim / Bỏ Ghim Tin nhắn
- **Method**: `PATCH`
- **Path**: `/conversations/messages/:id/pin`
- **Quyền**: `StaffAuthGuard` (`ADMIN`, `DOCTOR`, `NURSE`)
- **Input (Body - `PinMessageDto`)**: `{ "isPinned": true }`

---

### 8. Thu hồi Tin nhắn (Delete / Recall)
- **Method**: `DELETE`
- **Path**: `/conversations/messages/:id`
- **Quyền**: `StaffAuthGuard` / `AppAuthGuard` (Chỉ người gửi mới được thu hồi)

---

## ⚡ 2. Đặc Tả WebSocket Gateway (`/chat`)

### Kết nối Handshake
- **Namespace**: `/chat`
- **Auth Payload**:
```javascript
const socket = io('https://api.vndoctor.vn/chat', {
  auth: {
    token: 'Bearer <JWT_TOKEN>'
  }
});
```

### Events Client Gửi lên Server (`socket.emit`):
1. **`join_room`**: Tham gia vào room của phòng chat.
   ```json
   { "conversationId": "conv-uuid-1" }
   ```
2. **`leave_room`**: Rời khỏi room.
   ```json
   { "conversationId": "conv-uuid-1" }
   ```
3. **`send_message`**: Gửi tin nhắn realtime.
   ```json
   {
     "conversationId": "conv-uuid-1",
     "content": "Chào bác sĩ!",
     "messageType": "TEXT"
   }
   ```
4. **`typing`**: Báo trạng thái gõ phím.
   ```json
   { "conversationId": "conv-uuid-1", "isTyping": true }
   ```
5. **`message_read`**: Báo đã đọc tin nhắn.
   ```json
   { "conversationId": "conv-uuid-1", "messageId": "msg-uuid-1" }
   ```

### Events Server Broadcast về Client (`socket.on`):
1. **`new_message`**: Nhận tin nhắn mới.
2. **`user_typing`**: `{ conversationId, userId, isTyping }`.
3. **`message_read_receipt`**: `{ conversationId, messageId, userId, readAt }`.
