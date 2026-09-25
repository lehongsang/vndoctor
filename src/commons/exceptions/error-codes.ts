export enum ErrorCode {
  // Generic / HTTP errors
  BAD_REQUEST = 'BAD_REQUEST',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  BAD_GATEWAY = 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  HTTP_ERROR = 'HTTP_ERROR',

  // Auth & Token
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  TOKEN_MISSING = 'TOKEN_MISSING',
  TOKEN_INVALID_FORMAT = 'TOKEN_INVALID_FORMAT',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_BLACKLISTED = 'TOKEN_BLACKLISTED',
  TOKEN_AUDIENCE_MISMATCH = 'TOKEN_AUDIENCE_MISMATCH',
  REFRESH_TOKEN_INVALID = 'REFRESH_TOKEN_INVALID',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  REFRESH_TOKEN_BLACKLISTED = 'REFRESH_TOKEN_BLACKLISTED',

  // OTP & Verification
  OTP_INVALID = 'OTP_INVALID',
  OTP_EXPIRED = 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS_EXCEEDED = 'OTP_MAX_ATTEMPTS_EXCEEDED',
  OTP_COOLDOWN_ACTIVE = 'OTP_COOLDOWN_ACTIVE',
  VERIFICATION_TOKEN_INVALID = 'VERIFICATION_TOKEN_INVALID',
  VERIFICATION_TOKEN_EXPIRED = 'VERIFICATION_TOKEN_EXPIRED',

  // Accounts
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  ACCOUNT_PHONE_ALREADY_EXISTS = 'ACCOUNT_PHONE_ALREADY_EXISTS',
  ACCOUNT_EMAIL_ALREADY_EXISTS = 'ACCOUNT_EMAIL_ALREADY_EXISTS',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',

  // Staff
  STAFF_NOT_FOUND = 'STAFF_NOT_FOUND',
  STAFF_USERNAME_ALREADY_EXISTS = 'STAFF_USERNAME_ALREADY_EXISTS',
  STAFF_CODE_ALREADY_EXISTS = 'STAFF_CODE_ALREADY_EXISTS',
  STAFF_INACTIVE = 'STAFF_INACTIVE',
  STAFF_LOCKED = 'STAFF_LOCKED',
  STAFF_CANNOT_DELETE_SELF = 'STAFF_CANNOT_DELETE_SELF',

  // Facilities
  FACILITY_NOT_FOUND = 'FACILITY_NOT_FOUND',
  FACILITY_CODE_ALREADY_EXISTS = 'FACILITY_CODE_ALREADY_EXISTS',
  FACILITY_PARENT_NOT_FOUND = 'FACILITY_PARENT_NOT_FOUND',
  FACILITY_PARENT_CANNOT_BE_SELF = 'FACILITY_PARENT_CANNOT_BE_SELF',
  FACILITY_ACCESS_DENIED = 'FACILITY_ACCESS_DENIED',
  FACILITY_HAS_CHILDREN = 'FACILITY_HAS_CHILDREN',

  // Patient Links & Health Profiles
  PATIENT_NOT_FOUND = 'PATIENT_NOT_FOUND',
  PATIENT_LINK_NOT_FOUND = 'PATIENT_LINK_NOT_FOUND',
  PATIENT_ALREADY_LINKED = 'PATIENT_ALREADY_LINKED',
  PATIENT_NOT_LINKED = 'PATIENT_NOT_LINKED',
  HEALTH_PROFILE_NOT_FOUND = 'HEALTH_PROFILE_NOT_FOUND',
  HEALTH_PROFILE_ACCESS_DENIED = 'HEALTH_PROFILE_ACCESS_DENIED',
  HEALTH_RECORD_NOT_FOUND = 'HEALTH_RECORD_NOT_FOUND',

  // Clinical, Examinations & Prescriptions
  EXAMINATION_NOT_FOUND = 'EXAMINATION_NOT_FOUND',
  EXAMINATION_ALREADY_COMPLETED = 'EXAMINATION_ALREADY_COMPLETED',
  EXAMINATION_ALREADY_CANCELLED = 'EXAMINATION_ALREADY_CANCELLED',
  CHRONIC_DISEASE_NOT_FOUND = 'CHRONIC_DISEASE_NOT_FOUND',
  CHRONIC_DISEASE_CODE_ALREADY_EXISTS = 'CHRONIC_DISEASE_CODE_ALREADY_EXISTS',
  TREATMENT_PLAN_NOT_FOUND = 'TREATMENT_PLAN_NOT_FOUND',
  TREATMENT_TARGET_NOT_FOUND = 'TREATMENT_TARGET_NOT_FOUND',
  TREATMENT_DICTIONARY_NOT_FOUND = 'TREATMENT_DICTIONARY_NOT_FOUND',
  TREATMENT_DICTIONARY_CODE_ALREADY_EXISTS = 'TREATMENT_DICTIONARY_CODE_ALREADY_EXISTS',
  PRESCRIPTION_SCHEDULE_NOT_FOUND = 'PRESCRIPTION_SCHEDULE_NOT_FOUND',
  TIMESLOT_NOT_FOUND = 'TIMESLOT_NOT_FOUND',
  TIMESLOT_ALREADY_EXISTS = 'TIMESLOT_ALREADY_EXISTS',

  // Care Requests & SOS
  CARE_REQUEST_NOT_FOUND = 'CARE_REQUEST_NOT_FOUND',
  CARE_REQUEST_ALREADY_ASSIGNED = 'CARE_REQUEST_ALREADY_ASSIGNED',
  CARE_REQUEST_ALREADY_RESOLVED = 'CARE_REQUEST_ALREADY_RESOLVED',
  CARE_REQUEST_OPEN_EXISTS = 'CARE_REQUEST_OPEN_EXISTS',
  SOS_CASE_ALREADY_ASSIGNED = 'SOS_CASE_ALREADY_ASSIGNED',
  SOS_CASE_ALREADY_RESOLVED = 'SOS_CASE_ALREADY_RESOLVED',
  SOS_CASE_OPEN_EXISTS = 'SOS_CASE_OPEN_EXISTS',

  // Care Packages & Subscriptions
  CARE_PACKAGE_NOT_FOUND = 'CARE_PACKAGE_NOT_FOUND',
  CARE_PACKAGE_CODE_ALREADY_EXISTS = 'CARE_PACKAGE_CODE_ALREADY_EXISTS',
  CARE_PACKAGE_INACTIVE = 'CARE_PACKAGE_INACTIVE',
  CARE_PACKAGE_SOLD_OUT = 'CARE_PACKAGE_SOLD_OUT',
  CARE_SUBSCRIPTION_NOT_FOUND = 'CARE_SUBSCRIPTION_NOT_FOUND',
  CARE_SUBSCRIPTION_EXPIRED = 'CARE_SUBSCRIPTION_EXPIRED',
  CARE_SUBSCRIPTION_ALREADY_ACTIVE = 'CARE_SUBSCRIPTION_ALREADY_ACTIVE',
  CARE_SUBSCRIPTION_INVALID_STATUS = 'CARE_SUBSCRIPTION_INVALID_STATUS',
  CARE_SUBSCRIPTION_ALREADY_CANCELLED = 'CARE_SUBSCRIPTION_ALREADY_CANCELLED',
  CARE_SUBSCRIPTION_ALREADY_EXPIRED = 'CARE_SUBSCRIPTION_ALREADY_EXPIRED',
  CARE_SUBSCRIPTION_NOT_CONFIRMED = 'CARE_SUBSCRIPTION_NOT_CONFIRMED',
  CARE_SUBSCRIPTION_ALREADY_CONFIRMED = 'CARE_SUBSCRIPTION_ALREADY_CONFIRMED',

  // Conversations
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
  CONVERSATION_ACCESS_DENIED = 'CONVERSATION_ACCESS_DENIED',
  CONVERSATION_CLOSED = 'CONVERSATION_CLOSED',
  CONVERSATION_ARCHIVED = 'CONVERSATION_ARCHIVED',
  CONVERSATION_MESSAGE_NOT_FOUND = 'CONVERSATION_MESSAGE_NOT_FOUND',
  CONVERSATION_MESSAGE_CANNOT_DELETE = 'CONVERSATION_MESSAGE_CANNOT_DELETE',

  // Risk Assessments
  RISK_ASSESSMENT_NOT_FOUND = 'RISK_ASSESSMENT_NOT_FOUND',
  RISK_ASSESSMENT_RESULT_NOT_FOUND = 'RISK_ASSESSMENT_RESULT_NOT_FOUND',

  // Storage & Files
  FILE_REQUIRED = 'FILE_REQUIRED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_TYPE_INVALID = 'FILE_TYPE_INVALID',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  OCR_FAILED = 'OCR_FAILED',
}

/**
 * Standard Vietnamese human-readable messages mapped to every ErrorCode.
 */
export const DEFAULT_ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Generic / HTTP errors
  [ErrorCode.BAD_REQUEST]: 'Yêu cầu không hợp lệ',
  [ErrorCode.INVALID_INPUT]: 'Dữ liệu đầu vào không đúng định dạng hoặc không hợp lệ',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Thiếu trường thông tin bắt buộc',
  [ErrorCode.UNAUTHORIZED]: 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn',
  [ErrorCode.FORBIDDEN]: 'Bạn không có quyền thực hiện thao tác này',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Tài khoản không đủ quyền hạn truy cập',
  [ErrorCode.RESOURCE_NOT_FOUND]: 'Không tìm thấy tài nguyên yêu cầu',
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 'Tài nguyên đã tồn tại trên hệ thống',
  [ErrorCode.DUPLICATE_ENTRY]: 'Dữ liệu bị trùng lặp trong hệ thống',
  [ErrorCode.TOO_MANY_REQUESTS]: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau ít phút',
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau',
  [ErrorCode.METHOD_NOT_ALLOWED]: 'Phương thức HTTP không được hỗ trợ',
  [ErrorCode.REQUEST_TIMEOUT]: 'Yêu cầu đã quá thời gian xử lý (Timeout)',
  [ErrorCode.PAYLOAD_TOO_LARGE]: 'Dung lượng dữ liệu gửi lên vượt quá giới hạn cho phép',
  [ErrorCode.UNPROCESSABLE_ENTITY]: 'Không thể xử lý dữ liệu yêu cầu',
  [ErrorCode.BAD_GATEWAY]: 'Lỗi kết nối cổng dịch vụ máy chủ',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau',
  [ErrorCode.GATEWAY_TIMEOUT]: 'Hết thời gian phản hồi từ cổng dịch vụ máy chủ',
  [ErrorCode.HTTP_ERROR]: 'Lỗi giao thức mạng HTTP',

  // Auth & Token
  [ErrorCode.INVALID_CREDENTIALS]: 'Thông tin đăng nhập hoặc mật khẩu không chính xác',
  [ErrorCode.SESSION_EXPIRED]: 'Phiên làm việc đã hết hạn, vui lòng đăng nhập lại',
  [ErrorCode.TOKEN_MISSING]: 'Thiếu mã xác thực (Token)',
  [ErrorCode.TOKEN_INVALID_FORMAT]: 'Định dạng mã xác thực không hợp lệ',
  [ErrorCode.TOKEN_INVALID]: 'Mã xác thực không hợp lệ hoặc đã bị thay đổi',
  [ErrorCode.TOKEN_EXPIRED]: 'Mã xác thực đã hết hạn, vui lòng đăng nhập lại',
  [ErrorCode.TOKEN_BLACKLISTED]: 'Mã xác thực đã bị thu hồi hoặc đăng xuất',
  [ErrorCode.TOKEN_AUDIENCE_MISMATCH]: 'Mã xác thực không áp dụng cho phạm vi dịch vụ này',
  [ErrorCode.REFRESH_TOKEN_INVALID]: 'Refresh Token không hợp lệ',
  [ErrorCode.REFRESH_TOKEN_EXPIRED]: 'Refresh Token đã hết hạn, vui lòng đăng nhập lại',
  [ErrorCode.REFRESH_TOKEN_BLACKLISTED]: 'Refresh Token đã bị vô hiệu hóa',

  // OTP & Verification
  [ErrorCode.OTP_INVALID]: 'Mã OTP không chính xác',
  [ErrorCode.OTP_EXPIRED]: 'Mã OTP đã hết hiệu lực',
  [ErrorCode.OTP_MAX_ATTEMPTS_EXCEEDED]: 'Bạn đã nhập sai OTP quá số lần cho phép',
  [ErrorCode.OTP_COOLDOWN_ACTIVE]: 'Vui lòng chờ ít phút trước khi yêu cầu gửi lại OTP mới',
  [ErrorCode.VERIFICATION_TOKEN_INVALID]: 'Mã xác minh không hợp lệ',
  [ErrorCode.VERIFICATION_TOKEN_EXPIRED]: 'Mã xác minh đã hết hạn',

  // Accounts
  [ErrorCode.ACCOUNT_NOT_FOUND]: 'Không tìm thấy tài khoản người dùng',
  [ErrorCode.ACCOUNT_PHONE_ALREADY_EXISTS]: 'Số điện thoại này đã được đăng ký tài khoản',
  [ErrorCode.ACCOUNT_EMAIL_ALREADY_EXISTS]: 'Địa chỉ Email này đã được sử dụng',
  [ErrorCode.ACCOUNT_INACTIVE]: 'Tài khoản hiện đang bị khóa hoặc chưa được kích hoạt',
  [ErrorCode.ACCOUNT_LOCKED]: 'Tài khoản đã bị tạm khóa do vi phạm hoặc bảo mật',

  // Staff
  [ErrorCode.STAFF_NOT_FOUND]: 'Không tìm thấy thông tin nhân viên y tế',
  [ErrorCode.STAFF_USERNAME_ALREADY_EXISTS]: 'Tên đăng nhập của nhân viên đã tồn tại',
  [ErrorCode.STAFF_CODE_ALREADY_EXISTS]: 'Mã nhân viên y tế đã tồn tại',
  [ErrorCode.STAFF_INACTIVE]: 'Tài khoản nhân viên y tế đang tạm ngưng hoạt động',
  [ErrorCode.STAFF_LOCKED]: 'Tài khoản nhân viên y tế đã bị khóa',
  [ErrorCode.STAFF_CANNOT_DELETE_SELF]: 'Bạn không thể tự xóa tài khoản của chính mình',

  // Facilities
  [ErrorCode.FACILITY_NOT_FOUND]: 'Không tìm thấy cơ sở y tế',
  [ErrorCode.FACILITY_CODE_ALREADY_EXISTS]: 'Mã cơ sở y tế đã tồn tại',
  [ErrorCode.FACILITY_PARENT_NOT_FOUND]: 'Không tìm thấy cơ sở y tế tuyến trên trực thuộc',
  [ErrorCode.FACILITY_PARENT_CANNOT_BE_SELF]: 'Cơ sở y tế không thể tự chọn chính mình làm tuyến trên',
  [ErrorCode.FACILITY_ACCESS_DENIED]: 'Bạn không có quyền thao tác trên cơ sở y tế này',
  [ErrorCode.FACILITY_HAS_CHILDREN]: 'Không thể xóa cơ sở y tế khi vẫn còn các cơ sở trực thuộc',

  // Patient Links & Health Profiles
  [ErrorCode.PATIENT_NOT_FOUND]: 'Không tìm thấy thông tin bệnh nhân',
  [ErrorCode.PATIENT_LINK_NOT_FOUND]: 'Không tìm thấy bản ghi liên kết giữa bệnh nhân và cơ sở y tế',
  [ErrorCode.PATIENT_ALREADY_LINKED]: 'Bệnh nhân đã được liên kết với cơ sở y tế này',
  [ErrorCode.PATIENT_NOT_LINKED]: 'Bệnh nhân chưa được liên kết với cơ sở y tế này',
  [ErrorCode.HEALTH_PROFILE_NOT_FOUND]: 'Không tìm thấy hồ sơ sức khỏe',
  [ErrorCode.HEALTH_PROFILE_ACCESS_DENIED]: 'Bạn không có quyền truy cập vào hồ sơ sức khỏe này',
  [ErrorCode.HEALTH_RECORD_NOT_FOUND]: 'Không tìm thấy bản ghi theo dõi sức khỏe',

  // Clinical, Examinations & Prescriptions
  [ErrorCode.EXAMINATION_NOT_FOUND]: 'Không tìm thấy phiếu khám bệnh',
  [ErrorCode.EXAMINATION_ALREADY_COMPLETED]: 'Phiếu khám bệnh đã hoàn thành, không thể chỉnh sửa',
  [ErrorCode.EXAMINATION_ALREADY_CANCELLED]: 'Phiếu khám bệnh đã bị hủy trước đó',
  [ErrorCode.CHRONIC_DISEASE_NOT_FOUND]: 'Không tìm thấy danh mục bệnh mạn tính',
  [ErrorCode.CHRONIC_DISEASE_CODE_ALREADY_EXISTS]: 'Mã bệnh mạn tính đã tồn tại',
  [ErrorCode.TREATMENT_PLAN_NOT_FOUND]: 'Không tìm thấy kế hoạch điều trị',
  [ErrorCode.TREATMENT_TARGET_NOT_FOUND]: 'Không tìm thấy mục tiêu điều trị của bệnh nhân',
  [ErrorCode.TREATMENT_DICTIONARY_NOT_FOUND]: 'Không tìm thấy mục tiêu trong từ điển điều trị',
  [ErrorCode.TREATMENT_DICTIONARY_CODE_ALREADY_EXISTS]: 'Mã mục tiêu điều trị đã tồn tại trong từ điển',
  [ErrorCode.PRESCRIPTION_SCHEDULE_NOT_FOUND]: 'Không tìm thấy lịch uống thuốc',
  [ErrorCode.TIMESLOT_NOT_FOUND]: 'Không tìm thấy khung giờ khám',
  [ErrorCode.TIMESLOT_ALREADY_EXISTS]: 'Khung giờ khám này đã tồn tại',

  // Care Requests & SOS
  [ErrorCode.CARE_REQUEST_NOT_FOUND]: 'Không tìm thấy yêu cầu chăm sóc y tế',
  [ErrorCode.CARE_REQUEST_ALREADY_ASSIGNED]: 'Yêu cầu chăm sóc đã được phân công nhân sự tiếp nhận',
  [ErrorCode.CARE_REQUEST_ALREADY_RESOLVED]: 'Yêu cầu chăm sóc đã được xử lý hoàn tất',
  [ErrorCode.CARE_REQUEST_OPEN_EXISTS]: 'Bệnh nhân đang có một yêu cầu chăm sóc chưa hoàn tất',
  [ErrorCode.SOS_CASE_ALREADY_ASSIGNED]: 'Ca cấp cứu SOS đã có nhân viên tiếp nhận',
  [ErrorCode.SOS_CASE_ALREADY_RESOLVED]: 'Ca cấp cứu SOS đã được xử lý hoàn thành',
  [ErrorCode.SOS_CASE_OPEN_EXISTS]: 'Đang có một ca cấp cứu SOS đang hoạt động cho bệnh nhân này',

  // Care Packages & Subscriptions
  [ErrorCode.CARE_PACKAGE_NOT_FOUND]: 'Không tìm thấy gói chăm sóc sức khỏe',
  [ErrorCode.CARE_PACKAGE_CODE_ALREADY_EXISTS]: 'Mã gói chăm sóc sức khỏe đã tồn tại',
  [ErrorCode.CARE_PACKAGE_INACTIVE]: 'Gói chăm sóc sức khỏe hiện đang tạm ngưng phục vụ',
  [ErrorCode.CARE_PACKAGE_SOLD_OUT]: 'Gói chăm sóc sức khỏe đã hết số lượng đăng ký',
  [ErrorCode.CARE_SUBSCRIPTION_NOT_FOUND]: 'Không tìm thấy gói đăng ký chăm sóc của bệnh nhân',
  [ErrorCode.CARE_SUBSCRIPTION_EXPIRED]: 'Gói đăng ký chăm sóc sức khỏe đã hết hạn',
  [ErrorCode.CARE_SUBSCRIPTION_ALREADY_ACTIVE]: 'Bệnh nhân đang có gói chăm sóc sức khỏe đang hoạt động',
  [ErrorCode.CARE_SUBSCRIPTION_INVALID_STATUS]: 'Trạng thái gói đăng ký không hợp lệ để thực hiện thao tác này',
  [ErrorCode.CARE_SUBSCRIPTION_ALREADY_CANCELLED]: 'Gói đăng ký chăm sóc sức khỏe đã bị hủy',
  [ErrorCode.CARE_SUBSCRIPTION_ALREADY_EXPIRED]: 'Gói đăng ký chăm sóc sức khỏe đã hết hạn sử dụng',
  [ErrorCode.CARE_SUBSCRIPTION_NOT_CONFIRMED]: 'Gói đăng ký chưa được bệnh nhân xác nhận trên ứng dụng',
  [ErrorCode.CARE_SUBSCRIPTION_ALREADY_CONFIRMED]: 'Gói đăng ký đã được bệnh nhân xác nhận trước đó',

  // Conversations
  [ErrorCode.CONVERSATION_NOT_FOUND]: 'Không tìm thấy phòng hội thoại',
  [ErrorCode.CONVERSATION_ACCESS_DENIED]: 'Bạn không phải là thành viên trong phòng hội thoại này',
  [ErrorCode.CONVERSATION_CLOSED]: 'Phòng hội thoại đã đóng',
  [ErrorCode.CONVERSATION_ARCHIVED]: 'Phòng hội thoại đã được lưu trữ',
  [ErrorCode.CONVERSATION_MESSAGE_NOT_FOUND]: 'Không tìm thấy tin nhắn',
  [ErrorCode.CONVERSATION_MESSAGE_CANNOT_DELETE]: 'Bạn không có quyền xóa tin nhắn này',

  // Risk Assessments
  [ErrorCode.RISK_ASSESSMENT_NOT_FOUND]: 'Không tìm thấy phiếu đánh giá nguy cơ sức khỏe',
  [ErrorCode.RISK_ASSESSMENT_RESULT_NOT_FOUND]: 'Không tìm thấy kết quả đánh giá nguy cơ',

  // Storage & Files
  [ErrorCode.FILE_REQUIRED]: 'Vui lòng chọn tệp tin tải lên',
  [ErrorCode.FILE_TOO_LARGE]: 'Dung lượng tệp tin vượt quá giới hạn cho phép',
  [ErrorCode.FILE_TYPE_INVALID]: 'Định dạng tệp tin không được hỗ trợ',
  [ErrorCode.FILE_UPLOAD_FAILED]: 'Tải tệp tin lên hệ thống lưu trữ thất bại',
  [ErrorCode.OCR_FAILED]: 'Nhận diện hình ảnh y tế (OCR) thất bại',
};

/**
 * Returns human-readable Vietnamese description for any error code.
 *
 * @param errorCode - Enum or string error code.
 * @param fallback - Optional fallback message if not found.
 * @returns Descriptive message.
 */
export function getErrorMessage(errorCode: ErrorCode | string, fallback?: string): string {
  if (errorCode in DEFAULT_ERROR_MESSAGES) {
    return DEFAULT_ERROR_MESSAGES[errorCode as ErrorCode];
  }
  return fallback || String(errorCode);
}

