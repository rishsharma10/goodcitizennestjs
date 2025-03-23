import { Injectable } from '@nestjs/common';
import { RideDto } from './dto/driver.dto';
import { InjectModel } from '@nestjs/mongoose';
import { DriverRide, DriverRideDocument } from './entities/driver-ride.entity';
import { Model } from 'mongoose';

@Injectable()
export class DriverService {
    constructor(
      @InjectModel(DriverRide.name) private driverRideModel:Model<DriverRideDocument>
    ){}

    async start_ride(dto: RideDto, user) {
      try {
          let user_id = user._id;
          let {pickup_location, destination_location} = dto;
          let data = {driver_id: user_id, pickup_location,destination_location}
          await this.driverRideModel.create(data); 
          return { message : "Ride Started"}
      } catch (error) {
        throw error
      }
    }
}