import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginDto, OtpDto, ResponseUserDto, SignupDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model, Types } from 'mongoose';
import { Session, SessionDocument } from './entities/session.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CommonService } from '../common/common.service';
import { UserType } from 'src/common/utils';
import * as moment from 'moment';
import { validate } from 'class-validator';
import { Response } from 'express';

@Injectable()
export class UserService {
    private option = { lean: true } as const;
    private updateOption = { new: true } as const;
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
        private commonService: CommonService,

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
}
