import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginDto, OtpDto, ResponseUserDto, SignupDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model, Types } from 'mongoose';
import { Session, SessionDocument } from './entities/session.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CommonService } from '../common/common.service';
import { Query, UserType } from 'src/common/utils';
import * as moment from 'moment';
import { validate } from 'class-validator';
import { Response } from 'express';
import { UpdateUserDto, notification } from './dto/update-user.dto';
import { Notification, NotificationDocument } from 'src/entities/notification.entity';

@Injectable()
export class UserService {
    private option = { lean: true } as const;
    private updateOption = { new: true } as const;
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
        @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
        private commonService: CommonService,

    ) { }


    async notification(dto: notification, user) {
        try {
            let { status, pagination, limit } = dto
            let user_id = user._id
            let setOptions = await this.commonService.setOptions(pagination, limit)
            let query:Query = { user_id: new Types.ObjectId(user_id) }
            let count = await this.notificationModel.countDocuments(query)
            if(status){
                query.status = status
            }
            console.log("query",query)
            let population =[{ path: "driver_id", select: "first_name last_name email" }];
            let notification = await this.notificationModel.find(query, {}, setOptions).populate(population)
            let data = { count, notification }
            return data
        } catch (error) {
            throw error
        }
    }
}
