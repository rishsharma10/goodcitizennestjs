import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { modelDefinitions } from './entities';
import { JwtModule } from '@nestjs/jwt';
import { CommonService } from 'src/common/common.service';
import { commonModelDefinitions } from 'src/entities';

@Module({
  imports:[
    JwtModule,
    MongooseModule.forFeature([...modelDefinitions, ...commonModelDefinitions])
  ],
  controllers: [UserController],
  providers: [UserService, CommonService],
  exports: [MongooseModule],
})
export class UserModule {}
