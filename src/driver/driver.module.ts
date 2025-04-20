import { Module } from '@nestjs/common';
import { DriverService } from './driver.service';
import { DriverController } from './driver.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { rideModelDefinitions } from './entities';
import { modelDefinitions } from 'src/user/entities';
import { commonModelDefinitions } from 'src/entities';

@Module({
  imports: [MongooseModule.forFeature([...rideModelDefinitions, ...modelDefinitions, ...commonModelDefinitions])],
  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule { }
