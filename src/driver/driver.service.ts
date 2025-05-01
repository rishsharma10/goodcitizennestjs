import { Injectable } from '@nestjs/common';
import { RideDto } from './dto/driver.dto';
import { InjectModel } from '@nestjs/mongoose';
import { DriverRide, DriverRideDocument } from './entities/driver-ride.entity';
import { Model, Types } from 'mongoose';
import { ResponseUserDto } from 'src/user/dto/create-user.dto';
import { validate } from 'class-validator';
import { RideStatus } from 'src/common/utils';
import { Notification, NotificationDocument } from 'src/entities/notification.entity';
import { WebSocketService } from 'src/web-socket/web-socket.service';

@Injectable()
export class DriverService {
  private options = { lean: true, sort: { _id: -1 } } as const;
  private newOptions = { new: true } as const;
  constructor(
    @InjectModel(DriverRide.name) private driverRideModel: Model<DriverRideDocument>,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private readonly webSocketService: WebSocketService
  ) { }

  async profile(user) {
    try {
      const response = new ResponseUserDto(user);
      await validate(response, { whitelist: true });
      return { data: response }
    } catch (error) {
      throw error
    }
  }

  async start_ride(dto: RideDto, user) {
    try {
      let user_id = user._id;
      let { pickup_location, drop_location, pickup_address, drop_address } = dto;
      let pickup = { latitude: +pickup_location.latitude, longitude: +pickup_location.longitude }
      let drop = { latitude: +drop_location.latitude, longitude: +drop_location.longitude }
      let data = {
        driver_id: user_id,
        pickup_location: pickup,
        drop_location: drop,
        pickup_address,
        drop_address,
        status: RideStatus.STARTED,
      }
      let ride = await this.driverRideModel.create(data);
      let payload = { lat: pickup_location.latitude, long: pickup_location.longitude }
      let { driver, driverBearing } = await this.webSocketService.save_coordinates(user, payload);
      await this.webSocketService.findUsersAhead(driver._id, ride._id, driver?.latitude,
        driver?.longitude, driverBearing, 5, true);
      return { message: "Ride Started", data: ride } 
    } catch (error) {
      throw error
    }
  }

  async ride_detail(id: string, user) {
    try {
      let query = { _id: new Types.ObjectId(id), driver_id: new Types.ObjectId(user._id) }
      let ride = await this.driverRideModel.findOne(query, {}, this.options)
      return { data: ride }
    } catch (error) {
      throw error
    }
  }

  async end_ride(id: string, user) {
    try {
      let query = {
        _id: new Types.ObjectId(id),
        driver_id: new Types.ObjectId(user._id),
        status: RideStatus.STARTED
      }
      let update = { status: RideStatus.COMPLETED }
      let ride = await this.driverRideModel.findOneAndUpdate(query, update, this.newOptions);
      await this.notificationModel.updateMany(query, update);
      if (!ride) return { message: "Ride not found" }
      return { message: "Your Ride ends here. Thank you for tarveling with us!" }
    } catch (error) {
      throw error
    }
  }
}