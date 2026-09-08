import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';
import { ProfileRelationship } from '@/commons/enums/vndoctor.enum';

export class QueryHealthProfileDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({ description: 'ID tài khoản sở hữu' })
  @IsUUID()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({
    enum: ProfileRelationship,
    enumName: 'ProfileRelationship',
    description: 'Lọc theo mối quan hệ',
  })
  @IsEnum(ProfileRelationship)
  @IsOptional()
  relationship?: ProfileRelationship;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo CCCD' })
  @IsString()
  @IsOptional()
  citizenId?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo SĐT' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
