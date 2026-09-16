# 05. Module Health Profiles (Hồ sơ Sức khỏe)

## 📌 Tổng quan
Module `health-profiles` quản lý các hồ sơ sức khỏe cá nhân của người dùng App và hồ sơ tiếp nhận tại cơ sở y tế. 

### 🔹 Mô hình dữ liệu Tinh gọn (1 Hồ sơ gắn tối đa 1 Cơ sở Y tế):
- Mỗi hồ sơ (`HealthProfile`) có thể liên kết trực tiếp với tối đa **1 Cơ sở Y tế** (`facilityId`).
- `accountId` (`UUID | null`): ID tài khoản người dùng App sở hữu hồ sơ (bằng `null` nếu do CSYT tạo tiếp đón tại quầy).
- `facilityId` (`UUID | null`): ID cơ sở y tế quản lý hồ sơ.
- `isLinked` (`boolean`): Trạng thái đã liên kết thành công 2 chiều giữa **Cơ sở y tế** và **Tài khoản App** (chỉ `true` khi cả 2 bên đã kết nối).
- `linkStatus` (`enum`): `NOT_LINKED`, `PENDING`, `ACTIVE`, `UNLINKED`.
- `hospitalPatientCode` (`string | null`): Mã bệnh nhân nội bộ tại viện (hệ thống tự sinh `BN-YYYYMMDD-XXXX` hoặc do viện cấp).

---

## 🚀 Danh sách API

### 1. Tạo mới Hồ sơ sức khỏe trên App (App Auth)
- **Method**: `POST`
- **Path**: `/health-profiles`
- **Quyền**: `AppAuthGuard` (Người dùng ứng dụng)
- **Hành vi**: Tạo hồ sơ thuộc tài khoản đang đăng nhập, `facilityId = null`, `isLinked = false`, `linkStatus = 'NOT_LINKED'`.

#### 📥 Input Body (`CreateHealthProfileDto`)
```json
{
  "relationship": "SELF",
  "fullName": "Trần Văn An",
  "dob": "1985-05-20",
  "gender": "MALE",
  "citizenId": "079185001234",
  "phoneNumber": "0987654321",
  "address": "Phường Bến Nghé, Quận 1, TP.HCM",
  "bloodType": "O",
  "allergy": "Dị ứng Penicillin",
  "medicalHistory": "Tiền sử Tăng huyết áp",
  "chronicDiseaseIds": []
}
```

#### 📤 Output (201 Created)
```json
{
  "id": "01a0b123-4567-89ab-cdef-0123456789ab",
  "accountId": "01a0a3cb-f95c-73cf-be46-c48c351c4adf",
  "facilityId": null,
  "isLinked": false,
  "linkStatus": "NOT_LINKED",
  "hospitalPatientCode": null,
  "relationship": "SELF",
  "fullName": "Trần Văn An",
  "isAppLinked": true,
  "appLinkStatus": "LINKED"
}
```

---

### 2. Tạo mới Hồ sơ bệnh nhân tại Cơ sở Y tế (Staff Auth)
- **Method**: `POST`
- **Path**: `/health-profiles/facility`
- **Quyền**: `StaffAuthGuard` (Nhân viên Y tế / Tiếp đón)
- **Hành vi**: Tạo hồ sơ tiếp nhận tại viện, `accountId = null`, `facilityId = <ID_CSYT>`, `isLinked = false`, `linkStatus = 'NOT_LINKED'`, sinh tự động mã bệnh nhân `hospitalPatientCode`.

#### 📥 Input Body (`CreateFacilityHealthProfileDto`)
```json
{
  "relationship": "OTHER",
  "fullName": "Nguyễn Thị Bé",
  "dob": "1990-08-15",
  "gender": "FEMALE",
  "citizenId": "079190005678",
  "phoneNumber": "0987654321",
  "address": "Quận 1, TP.HCM",
  "bloodType": "A",
  "allergy": "Không",
  "medicalHistory": "Không",
  "chronicDiseaseIds": []
}
```

#### 📤 Output (201 Created)
```json
{
  "id": "01a0b999-8888-7777-6666-555544443333",
  "accountId": null,
  "facilityId": "01a08454-a217-70cc-9ff2-c03053354a10",
  "isLinked": false,
  "linkStatus": "NOT_LINKED",
  "hospitalPatientCode": "BN-20260916-A1B2",
  "relationship": "OTHER",
  "fullName": "Nguyễn Thị Bé",
  "isAppLinked": false,
  "appLinkStatus": "NOT_LINKED"
}
```

---

### 3. Danh sách Hồ sơ của tôi (App Auth)
- **Method**: `GET`
- **Path**: `/health-profiles/me`
- **Quyền**: `AppAuthGuard`
- **Mô tả**: Trả về toàn bộ hồ sơ cá nhân và người thân do tài khoản App sở hữu.

---

### 4. Danh sách Hồ sơ thuộc Cơ sở Y tế (Staff Auth)
- **Method**: `GET`
- **Path**: `/health-profiles` (hoặc `/health-profiles/facility`)
- **Quyền**: `StaffAuthGuard`
- **Quy tắc bảo mật**: Nhân viên chỉ xem được danh sách bệnh nhân thuộc cơ sở y tế mình đang công tác (`profile.facilityId = staff.facilityId`).
- **Query Params**: `search`, `citizenId`, `phoneNumber`, `relationship`, `linkStatus`, `page`, `limit`.

---

### 5. Danh sách Hồ sơ đã đăng ký Gói chăm sóc & Gán Bác sĩ (Doctor/Staff Auth)
- **Method**: `GET`
- **Path**: `/health-profiles/profileList` (hoặc `/health-profiles/profile-list`)
- **Quyền**: `StaffAuthGuard`
- **Mô tả**: Lấy danh sách bệnh nhân đã mua gói chăm sóc và được gán Bác sĩ/Điều dưỡng theo dõi.
