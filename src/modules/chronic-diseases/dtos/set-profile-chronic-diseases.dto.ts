import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetProfileChronicDiseasesDto {
  @ApiProperty({
    type: [String],
    description: 'Mảng các UUID bệnh mạn tính gán cho hồ sơ sức khỏe',
    example: ['018e6e5a-1234-7000-8000-000000000001', '018e6e5a-1234-7000-8000-000000000002'],
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  diseaseIds: string[];
}
