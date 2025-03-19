import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginDto, OtpDto, ResponseUserDto, SignupDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model, Types } from 'mongoose';
import { Session,SessionDocument } from './entities/session.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CommonService } from '../common/common.service';
import { UserType } from 'src/common/utils';
import moment from 'moment';
import { validate } from 'class-validator';
import { Response } from 'express';

@Injectable()
export class UserService {
  
}
