import { PartialType } from '@nestjs/swagger';
import { SignupDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(SignupDto) {}
