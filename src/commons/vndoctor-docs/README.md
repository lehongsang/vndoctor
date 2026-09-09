# 📚 Bộ Tài liệu Kỹ thuật API - VNDoctor Backend (Phase 1 & Phase 2)

Thư mục chứa tài liệu mô tả chi tiết đầu vào (Input), đầu ra (Output), phân quyền (Auth) và logic xử lý của từng module trong hệ sinh thái y tế **VNDoctor**:

| STT | File Tài liệu | Module | Mô tả |
| :---: | :--- | :--- | :--- |
| **01** | [`01-auth.md`](./01-auth.md) | `auth` | Cơ chế xác thực kép (Staff CMS JWT & Mobile App JWT) |
| **02** | [`02-facilities.md`](./02-facilities.md) | `facilities` | Mạng lưới cơ sở y tế theo phân tuyến (Tỉnh, Huyện, Xã, Phòng khám) |
| **03** | [`03-staff.md`](./03-staff.md) | `staff` | Quản lý Bác sĩ, Nhân viên y tế và phân quyền `StaffRole` |
| **04** | [`04-accounts.md`](./04-accounts.md) | `accounts` | Tài khoản bệnh nhân trên Mobile App |
| **05** | [`05-health-profiles.md`](./05-health-profiles.md) | `health-profiles` | Hồ sơ sức khỏe đa thành viên gia đình (Bản thân, Bố, Mẹ, Con...) |
| **06** | [`06-chronic-diseases.md`](./06-chronic-diseases.md) | `chronic-diseases` | Danh mục bệnh mạn tính chuẩn ICD-10 và gán bệnh nền cho hồ sơ |
| **07** | [`07-patient-links.md`](./07-patient-links.md) | `patient-links` | Tìm kiếm & liên kết hồ sơ bệnh viện với hồ sơ App |
| **08** | [`08-health-records.md`](./08-health-records.md) | `health-records` | Ghi nhận đo lường sinh hiệu cá nhân & API Tóm tắt chỉ số |
| **09** | [`09-risk-assessments.md`](./09-risk-assessments.md) | `risk-assessments` | Phân tầng nguy cơ SCORE2, cảnh báo **Red Flags** & Bác sĩ kết luận |
| **10** | [`10-examinations.md`](./10-examinations.md) | `examinations` | Phiếu khám bệnh lâm sàng của Bác sĩ (`EX-2026-xxx`) |
| **11** | [`11-treatment-dictionaries.md`](./11-treatment-dictionaries.md) | `treatment-dictionaries` | Bộ từ điển mục tiêu điều trị chuẩn y khoa **A1 $\rightarrow$ G5** (Auto-seed) |
| **12** | [`12-treatment-targets.md`](./12-treatment-targets.md) | `treatment-targets` | Mục tiêu điều trị cá nhân hóa & Luồng Bác sĩ duyệt (`DOCTOR_VERIFIED`) |
| **13** | [`13-treatment-plans.md`](./13-treatment-plans.md) | `treatment-plans` | Mẫu phác đồ viện (`treatment_templates`) & Phác đồ bệnh nhân (`treatment_plans`) |
| **14** | [`14-care-packages.md`](./14-care-packages.md) | `care-packages` | Danh mục gói dịch vụ chăm sóc y tế (Standard/VIP, thời hạn, giá) |
| **15** | [`15-care-subscriptions.md`](./15-care-subscriptions.md) | `care-subscriptions` | Đăng ký gói (`PENDING`), Phân công Care Team & Kích hoạt (`ACTIVE`) |
| **16** | [`16-care-requests.md`](./16-care-requests.md) | `care-requests` | Tiếp nhận yêu cầu hỗ trợ & Quy trình chuyển ca Điều dưỡng - Bác sĩ |
| **17** | [`17-conversations.md`](./17-conversations.md) | `conversations` | Hội thoại Care Team, Chat 1-1 & **WebSocket Gateway (`/chat`)** realtime |
| **18** | [`18-users.md`](./18-users.md) | `users` | Hồ sơ cá nhân người dùng hệ thống & Tải lên Avatar S3 |

