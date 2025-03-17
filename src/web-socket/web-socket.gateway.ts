import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { WebSocketService } from './web-socket.service';
import { CreateWebSocketDto } from './dto/create-web-socket.dto';
import { UpdateWebSocketDto } from './dto/update-web-socket.dto';

interface CustomSocket extends Socket {
  user_data: any;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly webSocketService: WebSocketService) {}

  async handleConnection(socket: CustomSocket, ...args: any[]) {
    try {
        console.log(`Client connected: ${socket.id}`);
    } catch (error) {
        throw error
    }
  }

  async handleDisconnect(socket: CustomSocket) {
    try {
        console.log(`Client disconnected: ${socket.id}`);
    } catch (err) {
        throw err
    }
  }

  @SubscribeMessage('createWebSocket')
  create(@MessageBody() createWebSocketDto: CreateWebSocketDto) {
    return this.webSocketService.create(createWebSocketDto);
  }

  @SubscribeMessage('findAllWebSocket')
  findAll() {
    return this.webSocketService.findAll();
  }

  @SubscribeMessage('findOneWebSocket')
  findOne(@MessageBody() id: number) {
    return this.webSocketService.findOne(id);
  }

  @SubscribeMessage('updateWebSocket')
  update(@MessageBody() updateWebSocketDto: UpdateWebSocketDto) {
    return this.webSocketService.update(updateWebSocketDto.id, updateWebSocketDto);
  }

  @SubscribeMessage('removeWebSocket')
  remove(@MessageBody() id: number) {
    return this.webSocketService.remove(id);
  }
}
