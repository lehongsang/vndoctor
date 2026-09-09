import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * DTO for Patient registering a Care Package subscription.
 */
export class CreateCareSubscriptionDto {
  @ApiProperty({
    description: 'UUID của hồ sơ sức khỏe bệnh nhân tham gia gói',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty({ message: 'healthProfileId không được để trống' })
  @IsUUID('4', { message: 'healthProfileId phải là UUID v4 hợp lệ' })
  healthProfileId: string;

  @ApiProperty({
    description: 'UUID của gói chăm sóc sức khỏe đăng ký',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsNotEmpty({ message: 'carePackageId không được để trống' })
  @IsUUID('4', { message: 'carePackageId phải là UUID v4 hợp lệ' })
  carePackageId: string;
}
