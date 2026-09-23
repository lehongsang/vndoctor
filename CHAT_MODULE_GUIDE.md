# 💬 TÀI LIỆU CHI TIẾT MODULE CHAT & WEBSOCKET GATEWAY

> **Module**: `Conversations & ChatGateway`  
> **Namespace WebSocket**: `/chat`  
> **REST Base URL**: `/api/conversations`  

---

## 1. TỔNG QUAN KIẾN TRÚC

Module Chat trong hệ thống **VNDoctor** phục vụ trao đổi chuyên môn, tư vấn y tế từ xa giữa **Bệnh nhân (App Account)** và **Nhân viên y tế (Bác sĩ, Điều dưỡng, Chuyên gia - Staff)**.

Hệ thống hoạt động theo mô hình Hybrid kết hợp:
1. **REST API (`/api/conversations`)**: Khởi tạo hội thoại, lấy lịch sử tin nhắn, đếm tin chưa đọc, đánh dấu đã đọc.
2. **WebSocket Gateway (`/chat`)**: Nhận/gửi tin nhắn thời gian thực, thông báo trạng thái đang gõ (`typing`), báo nhận tin (`read receipt`).

---

## 2. CƠ CHẾ XÁC THỰC DUAL JWT (ĐÃ CHUẨN HÓA)

Hệ thống quản lý 2 loại người dùng với 2 Secret Key độc lập:
* **Nhân viên y tế (`STAFF`)**: Ký bằng `JWT_STAFF_SECRET`.
* **Bệnh nhân (`APP_ACCOUNT`)**: Ký bằng `JWT_APP_SECRET`.

### 🔄 Luồng xác thực khi Client kết nối WebSocket:
1. Client gửi token qua một trong hai cách:
   * **Cách 1 (Khuyên dùng)**: `auth: { token: "<access_token>" }`
   * **Cách 2**: `extraHeaders: { authorization: "Bearer <access_token>" }`
2. `ChatGateway` ([chat.gateway.ts](file:///c:/Users/Admin/Desktop/tmt-navi/vndoctor/src/modules/conversations/gateways/chat.gateway.ts)) giải mã sơ bộ token (`jwt.decode`) để đọc trường `type`.
3. Lựa chọn secret key phù hợp để xác thực (`jwt.verify`):
   * `type === 'STAFF'` $\rightarrow$ Sử dụng `JWT_STAFF_SECRET`
   * `type === 'APP_ACCOUNT'` $\rightarrow$ Sử dụng `JWT_APP_SECRET`
   * Fallback $\rightarrow$ Sử dụng `JWT_SECRET`
4. Gán thông tin người dùng vào `client.data.user`. Nếu không hợp lệ $\rightarrow$ Tự động ngắt kết nối (`disconnect`).

---

## 3. CHI TIẾT CÁC SỰ KIỆN WEBSOCKET (SOCKET.IO)

### 3.1. Client Gửi lên Server (`socket.emit`)

| Sự kiện | Payload | Mô tả |
| :--- | :--- | :--- |
| `join_room` | `{"conversationId": "uuid"}` | Tham gia vào phòng chat `room_{conversationId}` để nhận tin nhắn realtime. |
| `leave_room` | `{"conversationId": "uuid"}` | Rời khỏi phòng chat khi người dùng đóng màn hình hội thoại. |
| `send_message`| `{"conversationId": "uuid", "content": "Nội dung", "type": "TEXT"}` | Gửi tin nhắn mới. Hỗ trợ các type: `TEXT`, `IMAGE`, `AUDIO`, `DOCUMENT`, `FILE`, `LOCATION`. |
| `typing` | `{"conversationId": "uuid", "isTyping": true}` | Báo cho thành viên khác biết người dùng đang soạn tin nhắn. |
| `message_read`| `{"conversationId": "uuid", "messageId": "uuid"}` | Báo đã đọc tin nhắn cho các thành viên trong phòng. |

---

### 3.2. Server Phát xuống Client (`socket.on`)

| Sự kiện | Data nhận được | Mô tả |
| :--- | :--- | :--- |
| `new_message` | `ConversationMessage` object | Phát tin nhắn mới đến toàn bộ thành viên trong phòng khi có người gửi tin. |
| `user_typing` | `{"conversationId": "...", "userId": "...", "isTyping": true/false}` | Nhận thông báo người dùng khác đang gõ hoặc đã dừng gõ. |
| `message_read_receipt` | `{"conversationId": "...", "messageId": "...", "userId": "...", "readAt": "..."}` | Nhận thông báo tin nhắn đã được đọc. |

---

## 4. CHI TIẾT CÁC REST API ENDPOINTS

Tất cả các API yêu cầu Bearer Token (`AppAuthGuard` hoặc `StaffAuthGuard`):

### 4.1. Danh sách cuộc hội thoại
* **Endpoint**: `GET /api/conversations`
* **Query Params**: `type` (`DIRECT`, `GROUP`, `CARE_PACKAGE`, `EMERGENCY`), `search`, `page`, `limit`.
* **Mô tả**: Trả về danh sách cuộc hội thoại người dùng đang tham gia kèm tin nhắn mới nhất và số tin chưa đọc.

### 4.2. Lấy lịch sử tin nhắn
* **Endpoint**: `GET /api/conversations/:id/messages`
* **Query Params**: `page`, `limit`, `before` (lấy tin nhắn trước một mốc thời gian / cursor paging).

### 4.3. Gửi tin nhắn qua REST API
* **Endpoint**: `POST /api/conversations/:id/messages`
* **Body Payload**:
  ```json
  {
    "content": "Bác sĩ ơi, chỉ số huyết áp của tôi hôm nay là 125/80 mmHg",
    "type": "TEXT",
    "attachments": []
  }
  ```

### 4.4. Đánh dấu đã đọc
* **Endpoint**: `POST /api/conversations/:id/read`
* **Mô tả**: Xóa trạng thái chưa đọc của cuộc hội thoại cho tài khoản hiện tại.

### 4.5. Đếm tổng số tin nhắn chưa đọc
* **Endpoint**: `GET /api/conversations/unread-count`
* **Response**:
  ```json
  {
    "unreadCount": 3
  }
  ```

---

## 5. MẪU CODE CLIENT KẾT NỐI (JAVASCRIPT / FLUTTER / REACT)

```javascript
import { io } from "socket.io-client";

// 1. Khởi tạo kết nối tới namespace /chat
const socket = io("http://localhost:3456/chat", {
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // Token Bệnh nhân hoặc Bác sĩ
  },
  transports: ["websocket", "polling"]
});

// 2. Lắng nghe kết nối thành công
socket.on("connect", () => {
  console.log("Connected to Chat Gateway with socket id:", socket.id);

  // 3. Tham gia vào phòng chat cụ thể
  socket.emit("join_room", { conversationId: "01a08454-a217-70cc-9ff2-c03053354a10" });
});

// 4. Lắng nghe tin nhắn mới
socket.on("new_message", (message) => {
  console.log("Tin nhắn mới nhận được:", message);
});

// 5. Lắng nghe trạng thái đang gõ
socket.on("user_typing", (data) => {
  console.log(`User ${data.userId} đang soạn tin: ${data.isTyping}`);
});

// 6. Gửi tin nhắn đi
function sendChatMessage(conversationId, text) {
  socket.emit("send_message", {
    conversationId: conversationId,
    content: text,
    type: "TEXT"
  }, (ack) => {
    console.log("Server phản hồi gửi tin:", ack);
  });
}
```
