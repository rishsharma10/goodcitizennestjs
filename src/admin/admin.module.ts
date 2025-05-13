import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { rideModelDefinitions } from 'src/driver/entities';
import { modelDefinitions } from 'src/user/entities';
import { commonModelDefinitions } from 'src/entities';
import { CommonService } from 'src/common/common.service';

@Module({
   imports: [
      JwtModule,
      HttpModule,
      MongooseModule.forFeature([...rideModelDefinitions, ...modelDefinitions, ...commonModelDefinitions]
      )],
  controllers: [AdminController],
  providers: [AdminService, CommonService],
})
export class AdminModule {}
