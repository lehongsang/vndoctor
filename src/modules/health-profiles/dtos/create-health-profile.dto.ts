import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
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

  @ApiPropertyOptional({ description: 'Chiều cao (cm)', example: 170.0 })
  @IsNumber()
  @Min(20)
  @Max(300)
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ description: 'Cân nặng (kg)', example: 65.0 })
  @IsNumber()
  @Min(1)
  @Max(500)
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ description: 'Có hút thuốc lá hay không', default: false, example: false })
  @IsBoolean()
  @IsOptional()
  isSmoking?: boolean;

  @ApiPropertyOptional({ description: 'Có bị bệnh tăng huyết áp không', default: false, example: false })
  @IsBoolean()
  @IsOptional()
  hasHypertension?: boolean;

  @ApiPropertyOptional({ description: 'Có bị mỡ máu / rối loạn lipid máu không', default: false, example: false })
  @IsBoolean()
  @IsOptional()
  hasDyslipidemia?: boolean;

  @ApiPropertyOptional({ description: 'Có bị đái tháo đường không', default: false, example: false })
  @IsBoolean()
  @IsOptional()
  hasDiabetes?: boolean;

  @ApiPropertyOptional({ description: 'Tiền sử đột quỵ não / Tai biến', default: false, example: false })
  @IsBoolean()
  @IsOptional()
  hasStroke?: boolean;

  @ApiPropertyOptional({ description: 'Nhồi máu cơ tim', default: false, example: false })
  @IsBoolean()
  @IsOptional()
  hasMyocardialInfarction?: boolean;

  @ApiPropertyOptional({ description: 'Hội chứng vành cấp', default: false, example: false })
  @IsBoolean()
  @IsOptional()
  hasAcuteCoronarySyndrome?: boolean;

  @ApiPropertyOptional({ description: 'Bệnh lý động mạch vành mạn', default: false, example: false })
  @IsBoolean()
  @IsOptional()
  hasCoronaryArteryDisease?: boolean;

  @ApiPropertyOptional({ description: 'Cơn thiếu máu não thoáng qua (TIA)', default: false, example: false })
  @IsBoolean()
  @IsOptional()
  hasTia?: boolean;

  @ApiPropertyOptional({ description: 'Phình động mạch chủ', default: false, example: false })
  @IsBoolean()
  @IsOptional()
  hasAorticAneurysm?: boolean;

  @ApiPropertyOptional({ description: 'Bệnh mạch máu ngoại vi', default: false, example: false })
  @IsBoolean()
  @IsOptional()
  hasPeripheralArteryDisease?: boolean;

  @ApiPropertyOptional({ description: 'Vữa xơ mạch máu lớn', default: false, example: false })
  @IsBoolean()
  @IsOptional()
  hasAtherosclerosis?: boolean;

  @ApiPropertyOptional({ description: 'Tăng Cholesterol máu gia đình', default: false, example: false })
  @IsBoolean()
  @IsOptional()
  hasFamilialHypercholesterolemia?: boolean;
}
