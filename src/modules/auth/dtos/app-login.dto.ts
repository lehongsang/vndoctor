import { PickType } from '@nestjs/swagger';
import { AppRegisterDto } from './app-register.dto';

/**
 * DTO for Patient Mobile App login.
 * Reuses phoneNumber and password validation from AppRegisterDto.
 */
export class AppLoginDto extends PickType(AppRegisterDto, [
  'phoneNumber',
  'password',
] as const) {}
