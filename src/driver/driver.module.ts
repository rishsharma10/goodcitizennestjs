import { Module } from '@nestjs/common';
import { DriverService } from './driver.service';
import { DriverController } from './driver.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { rideModelDefinitions } from './entities';
import { modelDefinitions } from 'src/user/entities';
import { commonModelDefinitions } from 'src/entities';
import { WebSocketService } from 'src/web-socket/web-socket.service';
import { JwtModule } from '@nestjs/jwt';
import { CommonService } from 'src/common/common.service';
import { NotificationService } from 'src/common/notification.service';
import { HttpModule } from '@nestjs/axios';
import { LocationService } from 'src/web-socket/location.service';

@Module({
  imports: [
    JwtModule,
    HttpModule,
    MongooseModule.forFeature([...rideModelDefinitions, ...modelDefinitions, ...commonModelDefinitions]

    )],
  controllers: [DriverController],
  providers: [DriverService, WebSocketService,CommonService,NotificationService,LocationService],
})
export class DriverModule { }
