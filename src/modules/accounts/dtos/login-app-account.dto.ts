import { PickType } from '@nestjs/swagger';
import { RegisterAppAccountDto } from './register-app-account.dto';

/**
 * DTO for Patient Mobile App login.
 * Reuses phoneNumber and password fields from RegisterAppAccountDto.
 */
export class LoginAppAccountDto extends PickType(RegisterAppAccountDto, [
  'phoneNumber',
  'password',
] as const) {}
