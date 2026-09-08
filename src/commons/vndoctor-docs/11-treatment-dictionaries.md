# 11. Module Treatment Dictionaries (Từ điển Mục tiêu Điều trị A1-G5)

## 📌 Tổng quan
Module `treatment-dictionaries` quản lý bộ từ điển y khoa chuẩn hóa về mục tiêu điều trị từ **A1** đến **G5**. Module có cơ chế tự động nạp (auto-seed) từ file dữ liệu [`treatment-target-dictionary.json`](file:///c:/Users/Admin/Desktop/tmt-navi/vndoctor/src/database/seeds/data/treatment-target-dictionary.json) khi khởi động hệ thống.

---

## 🚀 Danh sách API

### 1. Tra cứu Danh mục Từ điển Mục tiêu Điều trị
- **Method**: `GET`
- **Path**: `/treatment-dictionaries`
- **Quyền**: Public / App / Staff
- **Input (Query)**:
  - `search`: string (tìm theo mã `A1`, `B2`, hoặc nội dung chỉ định)
  - `page`: number
  - `limit`: number

#### 📤 Output (200 OK)
```json
{
  "data": [
    {
      "code": "A1",
      "assessmentNotes": "Tích cực thay đổi lối sống, chế độ ăn uống, sinh hoạt. Duy trì theo dõi hàng ngày.",
      "assessmentTimeframe": "Theo dõi Định kỳ 6 tháng/lần",
      "bpTarget": "+ Huyết áp tâm thu: 120-129 mmHg\n+ Huyết áp tâm trương: 70-79 mmHg",
      "lipidTarget": "Đảm bảo mục tiêu LDL-C < 3.0 mmol/l (< 116 mg/dl)",
      "bmiTarget": "BMI từ 20-23 tối ưu",
      "glycemicTarget": null,
      "renalTarget": "Xét nghiệm nước tiểu và chức năng thận định kỳ theo lịch bác sĩ hẹn.",
      "dietAdvice": "Ăn dưới 1 thìa cà phê muối mỗi ngày (dưới 5g).\nĂn nhiều rau, quả và các loại hạt. Hạn chế đồ ăn chế biến sẵn.",
      "exerciseAdvice": "Đi bộ, đạp xe hoặc bơi 30 phút/ngày, 5 ngày/tuần. Thêm 2–3 buổi tập tạ nhẹ.",
      "smokingAdvice": "Bỏ thuốc lá hoàn toàn. Thuốc lá làm huyết áp tăng cao hơn.",
      "notes": "Bỏ thuốc lá hoàn toàn."
    }
  ],
  "total": 35,
  "page": 1,
  "limit": 20
}
```

---

### 2. Xem chi tiết Một mã Mục tiêu
- **Method**: `GET`
- **Path**: `/treatment-dictionaries/:code`
- **Quyền**: Public / App / Staff
- **Param**: `code` (ví dụ: `A1`, `B1`, `C2`...)

#### 📤 Output (200 OK)
Trả về chi tiết 1 đối tượng `TreatmentTargetDictionary`.
