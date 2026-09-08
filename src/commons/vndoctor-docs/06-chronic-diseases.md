# 06. Module Chronic Diseases (Danh mục Bệnh mạn tính)

## 📌 Tổng quan
Module `chronic-diseases` quản lý danh mục các bệnh mạn tính chuẩn ICD-10 (Tăng huyết áp, Đái tháo đường, Mỡ máu, Bệnh mạch vành...) và bảng gán bệnh nền theo từng hồ sơ sức khỏe (`profile_chronic_diseases`).

---

## 🚀 Danh sách API

### 1. Tra cứu Danh mục Bệnh mạn tính
- **Method**: `GET`
- **Path**: `/chronic-diseases`
- **Quyền**: Public / App / Staff

#### 📥 Input (Query)
- `search`: string (tìm theo tên, mã bệnh, mã ICD-10)
- `category`: string (Tim mạch, Chuyển hóa, Hô hấp...)
- `isActive`: boolean
- `page`, `limit`

#### 📤 Output (200 OK)
```json
{
  "items": [
    {
      "id": "cd-uuid-1",
      "code": "SCORE2_HTN",
      "name": "Tăng huyết áp nguyên phát (vô căn)",
      "icd10Code": "I10",
      "category": "Tim mạch",
      "isActive": true,
      "displayOrder": 1
    }
  ],
  "total": 35,
  "page": 1,
  "limit": 50
}
```

---

### 2. Xem danh sách bệnh nền của một Hồ sơ sức khỏe
- **Method**: `GET`
- **Path**: `/chronic-diseases/profile/:healthProfileId`
- **Quyền**: Public / App / Staff

#### 📤 Output (200 OK)
Trả về mảng danh sách các bệnh mạn tính đang được gán cho hồ sơ sức khỏe.

---

### 3. Cập nhật danh sách bệnh nền cho Hồ sơ sức khỏe
- **Method**: `PUT`
- **Path**: `/chronic-diseases/profile/:healthProfileId`
- **Quyền**: App / Staff

#### 📥 Input (Body - `SetProfileChronicDiseasesDto`)
```json
{
  "diseaseIds": [
    "cd-uuid-1",
    "cd-uuid-2"
  ]
}
```
