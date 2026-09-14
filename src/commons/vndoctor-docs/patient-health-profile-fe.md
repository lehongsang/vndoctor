# Tích hợp FE - Hồ sơ sức khỏe bệnh nhân

Tài liệu này dùng chung cho hai đội FE nhưng được chia rõ theo ứng dụng và role:

- **Phần A - Patient App:** chỉ dành cho role `PATIENT`.
- **Phần B - Staff Portal:** dành cho staff lâm sàng và các role admin được cấp quyền đọc.

## Phân biệt hai API tạo hồ sơ

| Luồng | Role | API | Kết quả |
|---|---|---|---|
| Bệnh nhân tự tạo | `PATIENT` | `POST /api/patient/health-profiles` | Gắn ngay vào Patient hiện tại; có `relationship` thì tạo Patient người thân |
| Staff tạo | `NURSE`, `DOCTOR_MONITOR`, `DOCTOR_EXPERT` | `POST /api/staff/patient-health-profiles` | Tạo hồ sơ chưa liên kết, `patientId = null` |

Hai API có dữ liệu nhân khẩu học gần giống nhau nhưng không cùng nghiệp vụ và không thay thế cho nhau. `PATIENT` chính là role của tài khoản bệnh nhân.

---

# Phần A - Patient App

- Role: `PATIENT`.
- Token minh họa: `Authorization: Bearer <patient_token>`.
- Không gọi API có prefix `/api/staff`.
- Không hỗ trợ QR, nhập/tìm mã hồ sơ hoặc claim hồ sơ có sẵn.

## A1. Các luồng Patient App phải hỗ trợ

1. Xem các hồ sơ tài khoản được quyền quản lý.
2. Tự tạo hồ sơ cho chính mình bằng dữ liệu nhập tay.
3. Tạo hồ sơ người thân bằng dữ liệu nhập tay.
4. Nhận hồ sơ do staff gửi qua SSE và accept/reject.
5. Chia sẻ quyền quản lý hồ sơ cho một tài khoản bệnh nhân khác.

## A2. Danh sách hồ sơ có quyền truy cập

```http
GET /api/patient/health-profiles
Authorization: Bearer <patient_token>
```

Danh sách gồm các hồ sơ:

- Gắn với chính `Patient` của tài khoản.
- Người thân có quan hệ family member đang active.
- Được tài khoản khác chia sẻ và đã accept.
- Do staff gửi và tài khoản hiện tại đã accept liên kết.

Các field FE cần lưu:

- `id`: `profileId`, dùng cho API theo health profile.
- `patientId`: chủ thể bệnh nhân của hồ sơ, dùng khi tạo health record cho người thân.
- `accessRole`: `OWNER` hoặc `MANAGER`.
- `ownershipType`: `SELF`, `FAMILY`, hoặc `SHARED`.
- `relationship`: tên quan hệ như `Bố`, `Mẹ`, `Con` khi `ownershipType = FAMILY`, ngược lại là `null`.
- `isLinkedToAppProfile`: hồ sơ đã gắn vào một Patient App hay chưa.
- `profileCode`, `fullName`, `dateOfBirth`, `gender`, `bloodType`.
- `activeInsuranceCard`: thẻ bảo hiểm active mới nhất hoặc `null`.

`Patient.fullName` có thể `null` với tài khoản đăng ký chỉ bằng số điện thoại. FE dùng số điện thoại hoặc `patientCode` làm fallback cho đến khi bệnh nhân cập nhật qua `PATCH /api/patient/me`. `PatientHealthProfile.fullName` vẫn là field bắt buộc khi tạo health profile.

Chi tiết và cập nhật:

```http
GET /api/patient/health-profiles/:profileId
PATCH /api/patient/health-profiles/:profileId
Authorization: Bearer <patient_token>
```

Sau cập nhật, thay dữ liệu profile theo response hoặc tải lại danh sách.

## A3. Bệnh nhân tự tạo hồ sơ

```http
POST /api/patient/health-profiles
Authorization: Bearer <patient_token>
Content-Type: application/json
```

Body tối thiểu:

```json
{
  "fullName": "Nguyễn Văn Bình",
  "dateOfBirth": "1962-11-17",
  "gender": "MALE"
}
```

Quy tắc:

- Không gửi `relationship`.
- Backend gắn health profile ngay vào `Patient` hiện tại.
- Response có `patientId` của bệnh nhân hiện tại và `accessRole = OWNER`.
- Sau thành công, tải lại `GET /api/patient/health-profiles`.

## A4. Bệnh nhân tạo hồ sơ người thân

Dùng cùng endpoint nhưng bắt buộc FE gửi `relationship`:

```json
{
  "fullName": "Nguyễn Văn An",
  "dateOfBirth": "2010-05-20",
  "gender": "MALE",
  "relationship": "Con"
}
```

Quy tắc:

- `relationship`: chuỗi tối đa 100 ký tự, ví dụ `Bố`, `Mẹ`, `Vợ/Chồng`, `Con`, `Anh/Chị/Em`, `Khác`.
- Backend tạo một `Patient` độc lập, một health profile và một family member active.
- Response có `patientId` riêng của người thân và `accessRole = MANAGER`.
- FE phải lưu cả `id` (`profileId`) và `patientId`.

## A5. Các trường thông tin Bệnh lý nền (Có/Không) & Dị ứng thuốc

Khi tạo mới (`POST /api/patient/health-profiles` hoặc `POST /api/staff/patient-health-profiles`) hoặc cập nhật (`PATCH /api/patient/health-profiles/:profileId`), FE có thể gửi kèm các trường bệnh nền và dị ứng thuốc:

### Tổn thương cơ quan đích (4 trường Có/Không - `boolean`)
- `hasLeftVentricularHypertrophy` (`boolean`, optional): Phì đại thất trái trên siêu âm tim/điện tim.
- `hasAlbuminuriaOrMicroalbuminuria` (`boolean`, optional): Có Albumin/Microalbumin niệu.
- `hasCarotidWallDamage` (`boolean`, optional): Có tổn thương đáy mắt.
- `hasSilentInfarct` (`boolean`, optional): Tổn thương thầm lặng trên não (*silent infarct*).

### Bệnh lý mạn tính kèm theo (10 trường Có/Không - `boolean`)
- `diabetes` (`boolean`, optional): Đái tháo đường.
- `stroke` (`boolean`, optional): Đột quỵ não.
- `hasMyocardialInfarction` (`boolean`, optional): Tiền sử nhồi máu cơ tim.
- `hasAcuteCoronarySyndrome` (`boolean`, optional): Hội chứng vành cấp.
- `hasCoronaryArteryDisease` (`boolean`, optional): Bệnh lý mạch vành.
- `hasTia` (`boolean`, optional): Cơn thiếu máu não cục bộ thoáng qua (TIA).
- `hasAorticAneurysm` (`boolean`, optional): Phình động mạch chủ.
- `hasPeripheralArteryDisease` (`boolean`, optional): Bệnh mạch máu ngoại vi.
- `hasAtherosclerosis` (`boolean`, optional): Vữa xơ mạch máu lớn.
- `hasFamilialHypercholesterolemia` (`boolean`, optional): Tăng Cholesterol máu gia đình.

### Dị ứng thuốc (2 trường)
- `hasDrugAllergy` (`boolean`, optional): Có dị ứng thuốc hay không (chọn Có/Không).
- `drugAllergyDetail` (`string`, optional, tối đa 2000 ký tự): Chi tiết tên các thuốc bị dị ứng (hiển thị ô nhập text khi `hasDrugAllergy = true`).

*Ví dụ payload:*
```json
{
  "fullName": "Nguyễn Văn Bình",
  "dateOfBirth": "1962-11-17",
  "gender": "MALE",
  "diabetes": true,
  "stroke": false,
  "hasMyocardialInfarction": true,
  "hasDrugAllergy": true,
  "drugAllergyDetail": "Aspirin, Penicillin"
}
```

Khi nhập và quản lý chỉ số sức khỏe:

```http
POST /api/patient-health-profiles/:patientHealthProfileId/health-records
GET /api/patient-health-profiles/:patientHealthProfileId/health-records
GET /api/patient-health-profiles/:patientHealthProfileId/health-records/latest
GET /api/patient-health-profiles/:patientHealthProfileId/health-records/latest-today
GET /api/patient-health-profiles/:patientHealthProfileId/health-records/metric-config
GET /api/patient-health-profiles/:patientHealthProfileId/health-records/metrics/:metricCode/stats?startDate=...&endDate=...
GET /api/patient-health-profiles/:patientHealthProfileId/health-records/metrics/:metricCode/thresholds
GET /api/patient-health-profiles/:patientHealthProfileId/health-records/:id
PATCH /api/patient-health-profiles/:patientHealthProfileId/health-records/:id
DELETE /api/patient-health-profiles/:patientHealthProfileId/health-records/:id
Authorization: Bearer <patient_token>
```

- Bắt buộc truyền `patientHealthProfileId` trên URL param (cả cho chính mình và người thân).
- Body của `POST` chỉ chứa `measuredAt`, `metrics`, `inputSource` (không gửi profile/patient ID trong body).
- `GET .../health-records/latest`: Lấy chỉ số mới nhất của tất cả các lần đo từ trước tới nay kèm theo `unit` (và `secondaryUnit` nếu có). Nếu chưa có dữ liệu đo, API trả về object rỗng `{}`.
- `GET .../health-records/latest-today`: Lấy chỉ số mới nhất đo trong ngày hôm nay kèm theo `unit` (và `secondaryUnit` nếu có). Nếu hôm nay chưa có dữ liệu đo, API trả về object rỗng `{}`.
- Backend tự động kiểm tra quyền sở hữu/quản lý của tài khoản với hồ sơ tương ứng.

## A5. Nhận hồ sơ staff gửi qua số điện thoại

Patient App không gọi API tạo hồ sơ staff. App chỉ nhận link request và quyết định accept/reject.

### A5.1. Đồng bộ pending khi mở app hoặc reconnect

```http
GET /api/patient/health-profiles/link-requests?direction=INCOMING&status=PENDING
Authorization: Bearer <patient_token>
```

Chỉ gọi khi tải màn hình lần đầu hoặc sau khi SSE reconnect; không polling theo interval.

Response mỗi item nên được FE hiểu là "một lời mời nhận quyền sở hữu hồ sơ từ staff", không chỉ là request kỹ thuật. Vì vậy backend hiện trả và FE nên dùng thêm các nhóm thông tin sau để render danh sách:

- Thông tin hồ sơ:
  - `patientHealthProfileId`
  - `profileCode`
  - `fullName`
  - `dateOfBirth`
  - `gender`
- Thông tin cơ sở tạo hồ sơ:
  - `createdFacilityId`
  - `createdFacility`
- Thông tin staff gửi lời mời:
  - `requesterStaffUserId`
  - `requesterStaff`

Ví dụ response item:

```json
{
  "id": "link-request-id",
  "patientHealthProfileId": "profile-id",
  "profileCode": "HPF-VHGZGPL3",
  "fullName": "Nguyen Van Binh",
  "dateOfBirth": "2003-02-11T00:00:00.000Z",
  "gender": "MALE",
  "createdByUserId": "staff-user-id",
  "requesterStaffUserId": "staff-user-id",
  "targetUserId": "patient-user-id",
  "targetPhoneNumberSnapshot": "0901230001",
  "status": "PENDING",
  "createdFacilityId": "facility-id",
  "createdFacility": {
    "id": "facility-id",
    "name": "Phong kham ABC",
    "address": "123 Nguyen Trai",
    "logoUrl": null
  },
  "requesterStaff": {
    "id": "staff-user-id",
    "name": "BS. Nguyen Minh Anh",
    "email": "doctor.monitor@navi.local",
    "phoneNumber": "0901234567"
  },
  "createdAt": "2026-07-29T09:00:00.000Z",
  "updatedAt": "2026-07-29T09:00:00.000Z"
}
```

Ghi chú:

- `fullName` ở đây là tên người trên hồ sơ sức khỏe, hiện đang được dùng như tên hiển thị chính của hồ sơ.
- `createdFacility` có thể `null` với dữ liệu cũ hoặc hồ sơ không gắn đủ metadata cơ sở tạo.
- `requesterStaff` nên được FE coi là nullable để an toàn với dữ liệu cũ hoặc staff bị mất liên kết.

### A5.2. Mở SSE

```http
GET /api/patient/health-profiles/link-requests/stream
Authorization: Bearer <patient_token>
Accept: text/event-stream
```

Event:

```ts
type HealthProfileLinkStreamEvent =
  | {
      type: 'health-profile-link.connected';
      data: { connectedAt: string };
    }
  | {
      type: 'health-profile-link.created';
      data: { linkRequest: PatientHealthProfileLinkRequestDto };
    }
  | {
      type: 'health-profile-link.ping';
      data: { at: string };
    };
```

- `created`: hiển thị yêu cầu mới hoặc tải lại danh sách pending một lần.
- `connected`: kết nối thành công.
- `ping`: heartbeat 25 giây, không render.
- Nếu dùng bearer token, dùng SSE client/polyfill hỗ trợ `Authorization`; `EventSource` nguyên bản không thêm được custom header.
- Khi mất kết nối: reconnect SSE rồi đồng bộ pending một lần.

### A5.3. Accept hoặc reject

```http
PATCH /api/patient/health-profiles/link-requests/:id/accept
PATCH /api/patient/health-profiles/link-requests/:id/reject
Authorization: Bearer <patient_token>
```

Quy tắc:

- Chỉ tài khoản có `targetUserId` tương ứng được xử lý.
- Chỉ request `PENDING` được accept/reject.
- Tài khoản phải hoàn tất onboarding và có `patientId` trước khi accept.
- Accept: backend gắn hồ sơ staff tạo vào Patient hiện tại; FE tải lại danh sách health profile và pending request.
- Reject: không gắn hồ sơ; FE loại request khỏi danh sách pending.
- SSE không thay thế push notification/SMS khi app offline.

## A6. Chia sẻ hồ sơ cho tài khoản bệnh nhân khác

```http
POST /api/patient/health-profiles/:profileId/share-requests
Authorization: Bearer <patient_token>
Content-Type: application/json
```

```json
{
  "phoneNumber": "0903123456",
  "permission": "VIEW"
}
```

- `requesterPatientId`: bệnh nhân chủ sở hữu gửi lời mời.
- backend resolve `phoneNumber` sang patient app account đích.
- `targetPatientId`: bệnh nhân được mời quản lý sau khi resolve từ số điện thoại.
- `permission`:
  - `VIEW`: chỉ xem
  - `VIEW_AND_WRITE`: xem và nhập/cập nhật
- Chỉ owner được gửi lời mời.
- Không tự mời, không mời owner và không tạo request active trùng.
- Tối đa hai share request `PENDING` hoặc `ACCEPTED` trên một profile.
- Response của danh sách/tạo/cập nhật share request có thêm `requester` để app hiển thị ai đã chia sẻ hồ sơ cho mình:

```json
{
  "id": "share-request-id",
  "patientHealthProfileId": "profile-id",
  "requesterPatientId": "patient-owner-id",
  "targetPatientId": "patient-target-id",
  "targetUserId": "target-user-id",
  "targetPhoneNumberSnapshot": "0903123456",
  "fullName": "Nguyen Van An",
  "dateOfBirth": "2015-06-07T00:00:00.000Z",
  "gender": "MALE",
  "permission": "VIEW",
  "status": "PENDING",
  "requester": {
    "patientId": "patient-owner-id",
    "userId": "owner-user-id",
    "fullName": "Nguyen Van An",
    "phoneNumber": "0909888777"
  }
}
```

Response share request hiện có thêm:

- `targetUserId`
- `targetPhoneNumberSnapshot`
- `fullName`
- `dateOfBirth`
- `gender`
- `permission`

Danh sách và xử lý:

```http
GET /api/patient/health-profiles/share-requests?direction=INCOMING&status=PENDING
GET /api/patient/health-profiles/share-requests?direction=OUTGOING
PATCH /api/patient/health-profiles/share-requests/:id/accept
PATCH /api/patient/health-profiles/share-requests/:id/reject
PATCH /api/patient/health-profiles/share-requests/:id/cancel
PATCH /api/patient/health-profiles/share-requests/:id/revoke
Authorization: Bearer <patient_token>
```

Sau accept/revoke, tải lại health profile và share request.

## A7. API không dùng trên Patient App

- Không gọi `POST /api/staff/patient-health-profiles`.
- Không gọi `POST /api/staff/patient-health-profiles/:id/link-requests`.
- Không gọi API QR, resolve, verify hoặc claim bằng profile code.
- API singular cũ `/api/patient/health-profile` đã retire; chỉ dùng `/health-profiles`.

---

# Phần B - Staff Portal

## B1. Role và quyền gọi API

| API | `NURSE` | `DOCTOR_MONITOR` | `DOCTOR_EXPERT` | `FACILITY_ADMIN` | `SUPER_ADMIN` |
|---|---:|---:|---:|---:|---:|
| `GET /api/staff/patient-health-profiles` | Có | Có | Có | Có | Có |
| `POST /api/staff/patient-health-profiles` | Có | Có | Có | Không | Không |
| `GET /api/staff/patient-health-profiles/by-code/:profileCode` | Có | Có | Có | Không | Không |
| `GET /api/staff/patient-health-profiles/:id` | Có | Có | Có | Không | Không |
| `POST /api/staff/patient-health-profiles/:id/link-requests` | Có | Có | Có | Không | Không |

Staff Portal không gọi `POST /api/patient/health-profiles`; endpoint đó chỉ dành cho role `PATIENT` trên Patient App.

## B2. Luồng staff tạo và gửi hồ sơ cho bệnh nhân

1. Staff tạo health profile chưa liên kết tài khoản.
2. Staff gửi link request đến tài khoản bệnh nhân theo số điện thoại.
3. Patient App nhận request qua SSE.
4. Bệnh nhân accept hoặc reject.
5. Staff kiểm tra `isLinkedToAppProfile` để biết hồ sơ đã liên kết.

## B2A. Patient mobile tìm hồ sơ theo mã

```http
GET /api/patient/health-profiles/by-code/:profileCode?phoneNumber=03949123123
Authorization: Bearer <patient_token>
```

API này dùng cho mobile patient app khi người dùng nhập mã hồ sơ `HPF-...` để tra cứu nhanh.
Backend chỉ trả dữ liệu khi `phoneNumber` truyền lên khớp với `patient_health_profiles.phoneNumber` của hồ sơ tìm được.
Sau khi verify thành công, backend trả thêm `linkToken` ngắn hạn để FE gọi API liên kết mà không cần gửi lại số điện thoại.

Response rút gọn:

```json
{
  "profile": {
    "id": "019ef898-236d-708d-9a37-8a8a959bb7e6",
    "profileCode": "HPF-VHGZGPL3",
    "fullName": "Nguyen Van Binh",
    "phoneNumber": "03949123123",
    "isLinkedToAppProfile": false
  },
  "linkToken": "temporary-link-token",
  "linkTokenExpiresAt": "2026-07-24T12:30:00.000Z"
}
```

Response trả về:

- thông tin hồ sơ sức khỏe cơ bản
- bác sĩ phụ trách từ `patients.assignedDoctorId` nếu có
- cơ sở từ `patients.facilityId`, fallback `createdFacility` nếu hồ sơ chưa link bệnh nhân
- `healthStatus` gồm:
  - `currentDisease`
  - `medicalHistoryText`
  - `activeDiagnoses`
  - `latestRiskLevel`
  - `latestMeasuredAt`
  - `latestMetrics`

Lưu ý:

- API này tìm theo `patient_health_profiles.profileCode`
- `phoneNumber` là bắt buộc để verify trước khi trả dữ liệu
- backend chấp nhận đối chiếu tương đương giữa các format `0...`, `84...`, `+84...`
- chỉ nhận mã dạng `HPF-...`
- không dùng `patients.patientCode` dạng `PAT-...`
- không phụ thuộc `patient_care_subscriptions`

## B2B. Patient mobile liên kết hồ sơ sau khi đã verify

```http
POST /api/patient/health-profiles/by-code/:profileCode/link
Authorization: Bearer <patient_token>
Content-Type: application/json
```

```json
{
  "linkToken": "temporary-link-token"
}
```

Quy tắc:

- FE chỉ gọi API này sau khi đã gọi `GET /api/patient/health-profiles/by-code/:profileCode?phoneNumber=...`.
- `linkToken` là token xác minh ngắn hạn backend trả từ API search.
- Backend kiểm tra `linkToken` có đúng với `profileCode` và đúng với user/patient hiện tại hay không.
- Nếu hồ sơ đã được liên kết trước đó, backend trả lỗi và không ghi đè.
- Khi link thành công, backend gán `patient_health_profiles.patientId = currentUser.patientId`.
- Sau khi link xong, FE tải lại `GET /api/patient/health-profiles`.

## B3. Staff tạo hồ sơ chưa liên kết

```http
POST /api/staff/patient-health-profiles
Authorization: Bearer <staff_token>
Content-Type: application/json
```

Body:

```json
{
  "fullName": "Nguyễn Văn Bình",
  "dateOfBirth": "1962-11-17",
  "gender": "MALE",
  "phoneNumber": "+84901234567"
}
```

Các field được phép nhập gồm:

- Bắt buộc: `fullName`, tối đa 255 ký tự.
- Không bắt buộc: `dateOfBirth`, `gender`, `bloodType`, `citizenIdNumber`, `email`, `phoneNumber`, địa chỉ, `heightCm`, `weightKg`, `currentDisease`.
- Không gửi `relationship`. Field này chỉ có ý nghĩa khi Patient App tạo hồ sơ người thân; Staff API không tạo family member.

Response quan trọng:

```ts
interface StaffCreatedHealthProfile {
  id: string;
  patientId: null;
  createdByUserId: string;
  isLinkedToAppProfile: false;
  profileCode: string;
  fullName: string;
}
```

Lưu `id` để gửi link request. Việc nhập `phoneNumber` trong hồ sơ không tự động gửi hoặc liên kết tài khoản.

### Ghi chú về scope danh sách staff

- `POST /api/staff/patient-health-profiles`: Tạo hồ sơ mới gắn với cơ sở y tế của staff hiện tại (`createdFacilityId`).
- `GET /api/staff/patient-health-profiles`: Trả về danh sách hồ sơ mà staff có quyền truy cập, bao gồm:
  1. Các hồ sơ được tạo bởi bất kỳ staff nào trong cùng cơ sở y tế (`createdFacilityId = user.facilityId`).
  2. Các hồ sơ do chính staff tạo (`createdByUserId = user.id`).
  3. Các hồ sơ có gói chăm sóc đang hoạt động (`patient_care_subscriptions`) trong nhóm điều trị (`care_groups`) mà staff là thành viên hoạt động.
- `GET /api/staff/patient-health-profiles/:id`: Cho phép bất kỳ staff nào trong cùng cơ sở y tế (hoặc người tạo) xem chi tiết hồ sơ.

## B4. Staff gửi link request theo phone

```http
POST /api/staff/patient-health-profiles/:id/link-requests
Authorization: Bearer <staff_token>
Content-Type: application/json
```

```json
{ "phoneNumber": "+84901234567" }
```

Quy tắc:

- `phoneNumber` trong request này là số dùng để tìm tài khoản Patient App và là dữ liệu quyết định người nhận.
- Chỉ staff đã tạo health profile đó được gửi link request.
- Số điện thoại phải thuộc một tài khoản role `PATIENT`.
- Không tạo request nếu hồ sơ đã liên kết tài khoản khác hoặc đã có request `PENDING` trùng.
- Thành công chỉ có nghĩa request đã được tạo; hồ sơ chưa liên kết cho đến khi bệnh nhân accept.

Response:

```ts
interface PatientHealthProfileLinkRequestDto {
  id: string;
  patientHealthProfileId: string;
  requesterStaffUserId: string;
  targetUserId: string;
  targetPhoneNumberSnapshot: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Sau thành công, Staff FE hiển thị trạng thái local là “Đang chờ bệnh nhân xác nhận”. Backend phát SSE `health-profile-link.created` đến đúng Patient App.

## B5. Kiểm tra hồ sơ đã liên kết

Theo mã hồ sơ:

```http
GET /api/staff/patient-health-profiles/by-code/:profileCode
Authorization: Bearer <staff_token>
```

Theo ID đối với hồ sơ do chính staff hiện tại tạo:

```http
GET /api/staff/patient-health-profiles/:id
Authorization: Bearer <staff_token>
```

FE dùng:

- `isLinkedToAppProfile = false`: chưa liên kết tài khoản.
- `isLinkedToAppProfile = true`: bệnh nhân đã accept và hồ sơ có `patientId`.

Hiện chưa có API Staff riêng để tải danh sách outgoing link request. Vì vậy:

- Giữ `PENDING` từ response sau khi POST để hiển thị trong phiên hiện tại.
- Khi tải lại trang, dùng trạng thái liên kết của health profile.
- Không polling API Patient link request vì staff không có role gọi endpoint đó.

## B6. Danh sách hồ sơ staff được phép xem

```http
GET /api/staff/patient-health-profiles
Authorization: Bearer <staff_token>
```

Query optional:

| Param | Kiểu | Mô tả |
|---|---|---|
| `page` | number | Mặc định 1 |
| `limit` | number | Mặc định 10 |
| `search` | string | Tìm theo tên, mã hồ sơ hoặc số điện thoại |
| `careGroupId` | uuid | Lọc theo nhóm điều trị |
| `facilityId` | uuid | Chỉ `SUPER_ADMIN` |
| `sortBy` | string | `createdAt`, `fullName`, `profileCode` |
| `sortOrder` | string | `ASC`, `DESC` |

Phạm vi dữ liệu:

- `SUPER_ADMIN`: tất cả hồ sơ; có thể lọc facility/care group.
- `FACILITY_ADMIN`: hồ sơ thuộc các nhóm điều trị trong facility của mình.
- `NURSE`, `DOCTOR_MONITOR`, `DOCTOR_EXPERT`: hồ sơ có subscription active trong care group mà staff là thành viên active.

Response: `GetManyBaseResponseDto<PatientHealthProfileDto>`.

Bo sung metadata tren moi item:

- `createdByUserId`: id user tao ho so.
- `createdBy`: thong tin rut gon cua user tao ho so. Co the `null` neu user da bi xoa mem hoac mat lien ket.
- `createdFacilityId`: id co so da luu tai thoi diem tao ho so. Co the `null` voi ho so do patient app tao hoac du lieu cu.
- `createdFacility`: thong tin rut gon cua co so tao ho so. Co the `null` neu `createdFacilityId` khong co hoac record co so da mat lien ket.

## B7. Danh sách hồ sơ do chính tài khoản tạo

```http
GET /api/health-profiles/created-by-me?page=1&limit=10&sortBy=createdAt&sortOrder=DESC
Authorization: Bearer <staff_token>
```

- Backend tự lọc `createdByUserId` theo token; FE không gửi `userId`.
- Hỗ trợ `NURSE`, `DOCTOR_MONITOR`, `DOCTOR_EXPERT`, `FACILITY_ADMIN`, `SUPER_ADMIN`.
- Dùng cho màn hình “Hồ sơ tôi đã tạo”; không thay thế danh sách hồ sơ theo care group.

## B8. API không dùng trên Staff Portal

- Không gọi `POST /api/patient/health-profiles`.
- Không gọi link-request SSE của Patient App.
- Staff không accept/reject link request thay bệnh nhân.
- Staff không gửi `relationship` khi tạo health profile.
