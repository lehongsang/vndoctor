import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import {
  ProfileBloodType,
  ProfileGender,
  ProfileRelationship,
} from '@/commons/enums/vndoctor.enum';

export class CreateHealthProfileDto {
  @ApiProperty({
    enum: ProfileRelationship,
    enumName: 'ProfileRelationship',
    description: 'Mối quan hệ với chủ tài khoản (Bản thân, Bố, Mẹ, Con, Vợ/Chồng, Khác)',
    default: ProfileRelationship.SELF,
  })
  @IsEnum(ProfileRelationship)
  @IsNotEmpty()
  relationship: ProfileRelationship;

  @ApiProperty({ description: 'Họ và tên bệnh nhân', example: 'Trần Thị Mai' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName: string;

  @ApiProperty({ description: 'Ngày sinh (YYYY-MM-DD)', example: '1985-05-20' })
  @IsDateString()
  @IsNotEmpty()
  dob: string;

  @ApiProperty({ enum: ProfileGender, enumName: 'ProfileGender', description: 'Giới tính' })
  @IsEnum(ProfileGender)
  @IsNotEmpty()
  gender: ProfileGender;

  @ApiPropertyOptional({ description: 'Căn cước công dân (12 số)', example: '079185001234' })
  @IsString()
  @IsOptional()
  @Length(12, 12, { message: 'CCCD phải có đúng 12 chữ số' })
  citizenId?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại liên hệ riêng của người này', example: '0987654321' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ nơi ở hiện tại', example: 'Số 12 Nguyễn Thị Minh Khai, Quận 1, TP.HCM' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    enum: ProfileBloodType,
    enumName: 'ProfileBloodType',
    description: 'Nhóm máu',
    default: ProfileBloodType.UNKNOWN,
  })
  @IsEnum(ProfileBloodType)
  @IsOptional()
  bloodType?: ProfileBloodType;

  @ApiPropertyOptional({ description: 'Tiền sử dị ứng (thuốc, thức ăn...)', example: 'Dị ứng kháng sinh Penicillin, hải sản' })
  @IsString()
  @IsOptional()
  allergy?: string;

  @ApiPropertyOptional({ description: 'Tiền sử bệnh lý bản thân và gia đình', example: 'Bố có tiền sử đột quỵ lúc 60 tuổi' })
  @IsString()
  @IsOptional()
  medicalHistory?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Danh sách UUID các bệnh mạn tính nền đã mắc',
    example: ['018e6e5a-1234-7000-8000-000000000001'],
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  @IsOptional()
  chronicDiseaseIds?: string[];
}
