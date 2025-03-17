import { Injectable } from '@nestjs/common';
import { CreateWebSocketDto } from './dto/create-web-socket.dto';
import { UpdateWebSocketDto } from './dto/update-web-socket.dto';

@Injectable()
export class WebSocketService {
  create(createWebSocketDto: CreateWebSocketDto) {
    return 'This action adds a new webSocket';
  }

  findAll() {
    return `This action returns all webSocket`;
  }

  findOne(id: number) {
    return `This action returns a #${id} webSocket`;
  }

  update(id: number, updateWebSocketDto: UpdateWebSocketDto) {
    return `This action updates a #${id} webSocket`;
  }

  remove(id: number) {
    return `This action removes a #${id} webSocket`;
  }
}
