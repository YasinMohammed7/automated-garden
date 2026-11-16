import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto.js';

export class UpdateUserDto extends OmitType(CreateUserDto, ['emailAddress'] as const) {}
