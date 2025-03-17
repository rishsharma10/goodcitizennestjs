import { BadRequestException, Injectable } from '@nestjs/common';
import { OtpDto, ResponseUserDto, SignupDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model, Types } from 'mongoose';
import { Session,SessionDocument } from './entities/session.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CommonService } from '../common/common.service';
import { UserType } from 'src/common/utils';
import * as moment from 'moment';
import { validate } from 'class-validator';

@Injectable()
export class UserService {
  private option = { lean: true } as const;
  private updateOption = { new: true } as const;
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private commonService: CommonService,

  ){}

  async signup(dto: SignupDto):Promise<any>{
    try {
      let {email,password,fcm_token,device_type} = dto
      let query = { email: email.toLowerCase(), is_deleted: false }
      let projection = { email: 1}
      let isUser = await this.userModel.findOne(query, projection, this.option);
      if(isUser) throw new BadRequestException("Email already exist");
      let hashPassword = await this.commonService.hashPassword(password);
      let otp = "123456"
      let data = {
        ...dto,
        email: email.toLowerCase(),
        password: hashPassword,
        role: UserType.USER,
        otp,
        otp_expire_at: new Date(new Date().getTime() + 1 * 60000),
        created_at: moment().utc().valueOf()
      }
      let user = await this.userModel.create(data);
      let access_token = await this.commonService.generateTempToken(user._id, user.email, user.role)
      return { access_token }
    } catch (error) {
      throw error
    }
  }

  async verify_otp(dto: OtpDto, user):Promise<any>{
    try {
      const { otp, fcm_token, device_type } = dto;
      let query = { _id: user._id }
      let projection = { otp_expire_at: 1, otp: 1 }
      let fetch_user = await this.userModel.findById(query, projection, this.option);
      if (!fetch_user) throw new BadRequestException("User not found");
      if (new Date(fetch_user.otp_expire_at) < new Date()) throw new BadRequestException("Otp expired");
      if (+fetch_user.otp !== +otp) throw new BadRequestException("Invalid otp");
      let update = { otp_expire_at: null, otp: null, is_email_verified: true }
      let update_user = await this.userModel.findByIdAndUpdate(query, update, this.updateOption);
      if (!update_user) throw new BadRequestException("Failed to update user");
      let session = await this.createSession(update_user._id, UserType.USER, fcm_token, device_type);
      let access_token = await this.commonService.generateToken(update_user._id, session._id, update_user.email, UserType.USER)
      const userData = { ...update_user.toObject(), access_token };
      const response = new ResponseUserDto(userData);
      await validate(response, { whitelist: true });
      let data = { message: "Otp verified successfully.", ...response }
      return { data }
    } catch (error) {
      console.log("error----", error);
      throw error
    }
  }  

  createSession = async(user_id: string | Types.ObjectId,
    role: string,
    fcm_token: string,
    device_type: string) =>{
    return await this.sessionModel.create({ user_id, role, fcm_token, device_type })
  }

}
