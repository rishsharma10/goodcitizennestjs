import { Module } from '@nestjs/common';
import { WebSocketService } from './web-socket.service';
import { SocketGateway } from './web-socket.gateway';

@Module({
  providers: [SocketGateway, WebSocketService],
})
export class WebSocketModule {}
