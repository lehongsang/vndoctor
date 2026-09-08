# 13. Module Treatment Plans (Phác đồ & Mẫu Phác đồ Điều trị)

## 📌 Tổng quan
Module `treatment-plans` quản lý:
1. **Mẫu phác đồ chuẩn (`treatment_templates`)**: Quản lý các mẫu phác đồ điều trị theo cơ sở y tế và nhóm bệnh (Tim mạch, Chuyển hóa, Đái tháo đường...).
2. **Phác đồ bệnh nhân (`treatment_plans`)**: Phác đồ điều trị cá nhân hóa cho từng bệnh nhân với mã sinh tự động `TP-YYYY-XXXXX`, ngày bắt đầu/kết thúc, ghi chú bác sĩ và trạng thái:
   - `DRAFT`: Bản nháp
   - `ACTIVE`: Đang áp dụng
   - `COMPLETED`: Đã hoàn thành phác đồ
   - `DISCONTINUED`: Tạm ngừng / Hủy phác đồ

---

## 🚀 Danh sách API

### 1. Tạo mới Mẫu Phác đồ chuẩn (Staff)
- **Method**: `POST`
- **Path**: `/treatment-plans/templates`
- **Quyền**: `StaffAuthGuard` (`ADMIN`, `DOCTOR`)

#### 📥 Input (Body - `CreateTreatmentTemplateDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `templateName` | string | Có | Tên mẫu phác đồ |
| `diseaseCategory` | string | Không | Nhóm bệnh (Tim mạch, ĐTĐ...) |
| `content` | string | Có | Nội dung phác đồ chi tiết (Markdown/JSON) |
| `isActive` | boolean | Không | Trạng thái sử dụng (Mặc định: `true`) |

*Ví dụ Body:*
```json
{
  "templateName": "Phác đồ kiểm soát THA Độ 1 kèm ĐTĐ Type 2",
  "diseaseCategory": "Tim mạch & Chuyển hóa",
  "content": "# Phác đồ chuẩn\n1. Khởi trị ACEi/ARB kết hợp CCB\n2. Statin kiểm soát mỡ máu...",
  "isActive": true
}
```

---

### 2. Danh sách Mẫu Phác đồ (Staff)
- **Method**: `GET`
- **Path**: `/treatment-plans/templates`
- **Quyền**: `StaffAuthGuard`
- **Input (Query)**: `facilityId`, `diseaseCategory`, `isActive`, `page`, `limit`

---

### 3. Bác sĩ Lập Phác đồ Điều trị cho Bệnh nhân
- **Method**: `POST`
- **Path**: `/treatment-plans`
- **Quyền**: `StaffAuthGuard` (`DOCTOR`, `ADMIN`)

#### 📥 Input (Body - `CreateTreatmentPlanDto`)
| Trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `healthProfileId` | UUID | Có | ID hồ sơ bệnh nhân |
| `treatmentTargetId`| UUID | Không | ID mục tiêu điều trị gắn kèm |
| `title` | string | Có | Tiêu đề phác đồ điều trị |
| `startDate` | string | Không | Ngày bắt đầu (YYYY-MM-DD) |
| `endDate` | string | Không | Ngày kết thúc dự kiến (YYYY-MM-DD) |
| `doctorNotes` | string | Không | Ghi chú dặn dò, đơn thuốc điều trị |
| `status` | enum | Không | `DRAFT`, `ACTIVE`, `COMPLETED`, `DISCONTINUED` |

*Ví dụ Body:*
```json
{
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "treatmentTargetId": "target-uuid-1",
  "title": "Phác đồ điều trị Tăng huyết áp & Mỡ máu 3 tháng",
  "startDate": "2026-09-08",
  "endDate": "2026-12-08",
  "doctorNotes": "Tái khám sau 1 tháng để đánh giá lại đáp ứng thuốc",
  "status": "ACTIVE"
}
```

#### 📤 Output (201 Created)
```json
{
  "id": "plan-uuid-1",
  "planCode": "TP-2026-00001",
  "healthProfileId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "doctorId": "doctor-staff-uuid",
  "title": "Phác đồ điều trị Tăng huyết áp & Mỡ máu 3 tháng",
  "startDate": "2026-09-08",
  "endDate": "2026-12-08",
  "doctorNotes": "Tái khám sau 1 tháng để đánh giá lại đáp ứng thuốc",
  "status": "ACTIVE",
  "createdAt": "2026-09-08T09:00:00.000Z"
}
```

---

### 4. Bệnh nhân xem Danh sách Phác đồ của mình (App)
- **Method**: `GET`
- **Path**: `/treatment-plans/my-plans`
- **Quyền**: `AppAuthGuard`

---

### 5. Bác sĩ Cập nhật Phác đồ Điều trị
- **Method**: `PATCH`
- **Path**: `/treatment-plans/:id`
- **Quyền**: `StaffAuthGuard` (`DOCTOR`, `ADMIN`)
