import { Module } from '@nestjs/common';
import { DriverService } from './driver.service';
import { DriverController } from './driver.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { modelDefinitions } from './entities';

@Module({
  imports: [ MongooseModule.forFeature(modelDefinitions)],
  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule {}
