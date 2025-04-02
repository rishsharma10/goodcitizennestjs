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
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
    private option = { lean: true } as const;
    private updateOption = { new: true } as const;
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
        private commonService: CommonService,

    ) { }

    

    async update_profile(dto: UpdateUserDto, user) {
        try {
            const { email, old_password, new_password } = dto;
            let update: Query = {}
            if (email) {
                let query = { email: email.toLowerCase(), is_deleted: false }
                let projection = { email: 1 }
                let isUser = await this.userModel.findOne(query, projection, this.option);
                if (isUser) throw new BadRequestException("Email already exist");
                update.email = email.toLowerCase()
                update.is_email_verified = false
            }
        } catch (error) {
            throw error
        }
    }
}
