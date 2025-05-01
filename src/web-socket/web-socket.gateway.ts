import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebSocketService } from './web-socket.service';
import { DriverLatLong, LatLong } from './dto/web-socket.dto';
import { Types } from 'mongoose';
import { UnauthorizedException } from '@nestjs/common';

interface CustomSocket extends Socket {
  user: any;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private activeUsers = new Map<string, Socket>();
  constructor(private readonly webSocketService: WebSocketService) { }

  async handleConnection(socket: CustomSocket, ...args: any[]) {
    try {
      let token;
      token = socket.handshake.headers.token;
      if (!token) {
        token = socket.handshake.query.token;
      }
      if (!token) throw new UnauthorizedException();
      let user = await this.webSocketService.handleConnection(token, socket.id);
      if (!user) throw new UnauthorizedException();
      socket.user = user;
      this.activeUsers.set((user._id).toString(), socket);
    } catch (error) {
      throw error
    }
  }

  async handleDisconnect(socket: CustomSocket) {
    try {
      console.log(`Client disconnected: ${socket.id}`);
      const userId = socket.user?._id as string;
      if (userId) {
        await this.webSocketService.handleDisconnect(userId);
        this.activeUsers.delete(userId);
        console.log(`User ${userId} disconnected.`);
      }
    } catch (err) {
      throw err
    }
  }

  @SubscribeMessage("save_location")
  async save_lat_long(socket: CustomSocket, payload: LatLong) {
    try {
      let user= socket.user
      console.log("save_lat_long",user)
      await this.webSocketService.save_coordinates(user, payload)
    } catch (error) {
      throw error
    }
  }

  @SubscribeMessage("driver_location")
  async driver_location(socket: CustomSocket, payload: DriverLatLong) {
    try {
      let user = socket.user;
      console.log("driver_location",user)
      let { driver, driverBearing } = await this.webSocketService.save_coordinates(user, payload);
      await this.webSocketService.findUsersAhead(driver._id, payload.ride_id, driver?.latitude,
        driver?.longitude, driverBearing, 5,false);
    } catch (error) {
      throw error
    }
  }


  
}
