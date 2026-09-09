import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * DTO for creating a direct 1-1 conversation between Doctor and Patient.
 */
export class CreateDirectConversationDto {
  @ApiProperty({
    description: 'ID hồ sơ sức khỏe bệnh nhân',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty({ message: 'healthProfileId không được để trống' })
  @IsUUID('4', { message: 'healthProfileId phải là UUID hợp lệ' })
  healthProfileId: string;

  @ApiProperty({
    description: 'ID nhân viên y tế / Bác sĩ trong đoạn chat trực tiếp (users.id)',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsNotEmpty({ message: 'directUserId không được để trống' })
  @IsUUID('4', { message: 'directUserId phải là UUID hợp lệ' })
  directUserId: string;
}
