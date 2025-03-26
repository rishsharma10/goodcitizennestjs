import { Injectable } from '@nestjs/common';
import { RideDto } from './dto/driver.dto';
import { InjectModel } from '@nestjs/mongoose';
import { DriverRide, DriverRideDocument } from './entities/driver-ride.entity';
import { Model } from 'mongoose';
import { ResponseUserDto } from 'src/user/dto/create-user.dto';
import { validate } from 'class-validator';

@Injectable()
export class DriverService {
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
      console.log("dto", dto);

      let { pickup_location, drop_location } = dto;
      let pickup = { latitude: +pickup_location.latitude, longitude: +pickup_location.longitude }
      let drop = { latitude: +drop_location.latitude, longitude: +drop_location.longitude }
      let data = {
        driver_id: user_id,
        pickup_location: pickup,
        drop_location: drop
      }
      await this.driverRideModel.create(data);
      return { message: "Ride Started" }
    } catch (error) {
      throw error
    }
  }
}