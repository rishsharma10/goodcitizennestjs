import { Module } from '@nestjs/common';
import { WebSocketService } from './web-socket.service';
import { SocketGateway } from './web-socket.gateway';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { modelDefinitions } from 'src/user/entities';
import { JwtModule } from '@nestjs/jwt';
import { CommonService } from 'src/common/common.service';
import { WebSocketController } from './web-socket.controller';

@Module({
  imports: [
    JwtModule,
    MongooseModule.forFeature(modelDefinitions)
  ],
  controllers: [WebSocketController],
  providers: [SocketGateway, WebSocketService, CommonService],
})
export class WebSocketModule {}
