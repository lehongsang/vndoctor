import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StaffRole } from '@/commons/enums/vndoctor.enum';

export class CreateStaffDto {
  @ApiPropertyOptional({
    description: 'ID cơ sở y tế (Nếu là FacilityAdmin tạo, hệ thống sẽ tự động gán viện của Admin)',
    example: 'd3b07384-d113-46fb-a709-a1b74a6fc6d0',
  })
  @IsUUID()
  @IsOptional()
  facilityId?: string;

  @ApiProperty({ description: 'Mã nhân viên / Mã CCHN (Duy nhất)', example: 'CCHN-00123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  staffCode: string;

  @ApiProperty({ description: 'Họ và tên đầy đủ', example: 'BS. CKII Nguyễn Văn An' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName: string;

  @ApiProperty({ description: 'Email nhân viên (Bắt buộc dùng làm tài khoản)', example: 'dr.an@hospital.vn' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({
    description: 'Tên đăng nhập (Tùy chọn - nếu không nhập hệ thống sẽ tự động lấy từ Email)',
    example: 'dr_an',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  username?: string;

  @ApiPropertyOptional({
    description: 'Mật khẩu khởi tạo (Mặc định là vndoctor123 nếu không truyền)',
    example: 'vndoctor123',
    default: 'vndoctor123',
  })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiProperty({
    enum: StaffRole,
    enumName: 'StaffRole',
    description: 'Vai trò nhân sự (Bắt buộc chọn)',
    example: StaffRole.DOCTOR,
  })
  @IsEnum(StaffRole)
  @IsNotEmpty()
  role: StaffRole;

  @ApiPropertyOptional({ description: 'Chuyên khoa công tác', example: 'Tim mạch can thiệp' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  specialty?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại liên hệ', example: '0912345678' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phoneNumber?: string;
}
