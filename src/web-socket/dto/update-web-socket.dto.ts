import { PartialType } from '@nestjs/mapped-types';
import { CreateWebSocketDto } from './create-web-socket.dto';

export class UpdateWebSocketDto extends PartialType(CreateWebSocketDto) {
  id: number;
}
