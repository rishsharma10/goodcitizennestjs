import { Injectable } from '@nestjs/common';
import { RideDto } from './dto/driver.dto';
import { InjectModel } from '@nestjs/mongoose';
import { DriverRide, DriverRideDocument } from './entities/driver-ride.entity';
import { Model, Types } from 'mongoose';
import { ResponseUserDto } from 'src/user/dto/create-user.dto';
import { validate } from 'class-validator';
import { RideStatus } from 'src/common/utils';

@Injectable()
export class DriverService {
  private options = { lean: true, sort: { _id: -1 } } as const;
  private newOptions = { new: true } as const;
  constructor(
    @InjectModel(DriverRide.name) private driverRideModel: Model<DriverRideDocument>
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
      if (!ride) return { message: "Ride not found" }
      return { message: "Ride Completed" }
    } catch (error) {
      throw error
    }
  }
}