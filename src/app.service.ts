import { BadRequestException, Injectable } from '@nestjs/common';
import { User, UserDocument } from './user/entities/user.entity';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Session, SessionDocument } from './user/entities/session.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CommonService } from './common/common.service';
import * as moment from 'moment';
import {
  ForgotPassword,
  LoginDto,
  OtpDto,
  ResendOtp,
  ResetForgotPassword,
  ResponseUserDto,
  SignupDto,
  VerifyForgotPassword,
} from './user/dto/create-user.dto';
import { validate } from 'class-validator';
import { Query, RideStatus, UserType } from './common/utils';
import { UpdateUserDto } from './user/dto/update-user.dto';
import {
  DriverRide,
  DriverRideDocument,
} from './driver/entities/driver-ride.entity';

@Injectable()
export class AppService {
  private option = { lean: true } as const;
  private updateOption = { new: true } as const;
  private VERIFICATION_JWT_SECRET: string;
  private VERIFICATION_JWT_EXPIRY: string;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(DriverRide.name)
    private driverRideModel: Model<DriverRideDocument>,
    private commonService: CommonService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    (this.VERIFICATION_JWT_SECRET = this.configService.get<string>(
      'VERIFICATION_JWT_SECRET',
    )!),
      (this.VERIFICATION_JWT_EXPIRY = this.configService.get<string>(
        'VERIFICATION_JWT_EXPIRY',
      )!);
  }

  private async generateForgotPasswordToken(
    _id: Types.ObjectId | string,
    email: string,
    role: string,
  ) {
    return await this.jwtService.sign(
      { _id, email, role },
      {
        secret: this.VERIFICATION_JWT_SECRET,
        expiresIn: this.VERIFICATION_JWT_EXPIRY,
      },
    );
  }

  async signup(dto: SignupDto): Promise<any> {
    try {
      let { email, password, role, lat, long } = dto;
      let query = { email: email.toLowerCase(), is_deleted: false };
      let projection = { email: 1 };
      let isUser = await this.userModel.findOne(query, projection, this.option);
      if (isUser) throw new BadRequestException('Email already exist');
      let hashPassword = await this.commonService.hashPassword(password);
      let otp = '123456';
      let data = {
        ...dto,
        role: dto.role,
        email: email.toLowerCase(),
        password: hashPassword,
        otp,
        loyalty_point: role === UserType.USER ? 5 : 0,
        otp_expire_at: new Date(new Date().getTime() + 1 * 60000),
        pre_location: {
          type: 'Point',
          coordinates: [parseFloat(lat), parseFloat(long)],
        },
        location: {
          type: 'Point',
          coordinates: [parseFloat(lat), parseFloat(long)],
        },
        latitude: parseFloat(lat),
        longitude: parseFloat(long),
        created_at: moment().utc().valueOf(),
      };
      let user = await this.userModel.create(data);
      let access_token = await this.commonService.generateTempToken(
        user._id,
        user.email,
        user.role,
      );
      return { access_token };
    } catch (error) {
      throw error;
    }
  }

  async verify_otp(dto: OtpDto, user): Promise<any> {
    try {
      const { otp, fcm_token, device_type } = dto;
      let query = { _id: user._id };
      let projection = { otp_expire_at: 1, otp: 1 };
      let fetch_user = await this.userModel.findById(
        query,
        projection,
        this.option,
      );
      if (!fetch_user) throw new BadRequestException('User not found');
      if (new Date(fetch_user.otp_expire_at) < new Date())
        throw new BadRequestException('Otp expired');
      if (+fetch_user.otp !== +otp)
        throw new BadRequestException('Invalid otp');
      let update = { otp_expire_at: null, otp: null, is_email_verified: true };
      let update_user = await this.userModel.findByIdAndUpdate(
        query,
        update,
        this.updateOption,
      );
      if (!update_user) throw new BadRequestException('Failed to update user');
      let session = await this.createSession(
        update_user._id,
        update_user.role,
        fcm_token,
        device_type,
      );
      let access_token = await this.commonService.generateToken(
        update_user._id,
        session._id,
        update_user.email,
        update_user.role,
      );
      const userData = { ...update_user.toObject(), access_token };
      const response = new ResponseUserDto(userData);
      await validate(response, { whitelist: true });
      let data = { message: 'Otp verified successfully.', ...response };
      return { data };
    } catch (error) {
      console.log('error----', error);
      throw error;
    }
  }

  async profile(user) {
    try {
      let userData = { ...user };
      if (user.role === UserType.DRIVER) {
        let query = {
          driver_id: new Types.ObjectId(user._id),
          status: RideStatus.STARTED,
        };
        let ride = await this.driverRideModel.findOne(query, {}, this.option);
        let distance = ride
          ? await this.calculateDistance(
              ride.pickup_location,
              ride?.drop_location,
            )
          : null;
        userData = { ...user, ride_id: ride?._id ?? null, distance };
      }
      const response = new ResponseUserDto(userData);
      await validate(response, { whitelist: true });
      return { data: response };
    } catch (error) {
      throw error;
    }
  }

  async calculateDistance(
    pickup_location: { latitude: number; longitude: number },
    drop_location: { latitude: number; longitude: number },
  ): Promise<number> {
    try {
      console.log('pickup_location', pickup_location);
      console.log('drop_location', drop_location);

      const lat1 = pickup_location.latitude;
      const lon1 = pickup_location.longitude;
      const lat2 = drop_location.latitude;
      const lon2 = drop_location.longitude;

      const toRad = (value: number) => (value * Math.PI) / 180;

      const R = 6371; // Radius of the Earth in km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return distance; // in kilometers
    } catch (error) {
      throw error;
    }
  }

  async update_profile(dto: UpdateUserDto, user) {
    try {
      const {
        old_password,
        new_password,
        first_name,
        last_name,
        phone_number,
        country_code,
      } = dto;
      let update: Query = {};
      if (old_password && new_password) {
        let is_password = await this.commonService.compareHash(
          old_password,
          user.password,
        );
        if (!is_password) throw new BadRequestException('Incorrect password');
        let hashedPassword =
          await this.commonService.hashPassword(new_password);
        update.password = hashedPassword;
      }
      if (first_name) {
        update.first_name = first_name;
      }
      if (last_name) {
        update.last_name = last_name;
      }
      if (country_code) {
        update.country_code = country_code;
      }
      if (phone_number) {
        update.phone_number = phone_number;
      }
      let query = { _id: user._id };
      let result = await this.userModel
        .findByIdAndUpdate(query, update, { new: true })
        .lean();
      const response = new ResponseUserDto(result ?? {});
      await validate(response, { whitelist: true });
      return { data: response };
    } catch (error) {
      throw error;
    }
  }

  createSession = async (
    user_id: string | Types.ObjectId,
    role: string,
    fcm_token: string,
    device_type: string,
  ) => {
    await this.sessionModel.deleteMany({ user_id });
    return await this.sessionModel.create({
      user_id,
      role,
      fcm_token,
      device_type,
    });
  };

  async login(dto: LoginDto, res: Response) {
    try {
      let { email, password, fcm_token, device_type, lat, long } = dto;
      let query = { email: email.toLowerCase(), is_deleted: false };
      let projection = { email: 1, password: 1, role: 1, is_email_verified: 1 };
      let users = await this.userModel.find({}, projection, this.option);
      console.log('====================================');
      console.log(users);
      console.log('====================================');
      let isUser = await this.userModel.findOne(query, projection, this.option);
      if (!isUser)
        throw new BadRequestException("User doesn't exist. Please sign-up.");
      let is_password = await this.commonService.compareHash(
        password,
        isUser.password,
      );
      if (!is_password) throw new BadRequestException('Incorrect password');
      if (isUser.is_email_verified === false) {
        let access_token = await this.commonService.generateTempToken(
          isUser._id,
          isUser.email,
          isUser.role,
        );
        await this.generate_otp(isUser._id);
        let data = {
          is_email_verified: isUser.is_email_verified,
          access_token,
        };
        return { data };
      }
      let isPassword = await this.commonService.compareHash(
        password,
        isUser.password,
      );
      if (!isPassword)
        throw new BadRequestException('Incorrect email or password!.');
      let session = await this.createSession(
        isUser._id,
        isUser.role,
        fcm_token,
        device_type,
      );
      let access_token = await this.commonService.generateToken(
        isUser._id,
        session._id,
        isUser.email,
        isUser.role,
      );
      let update = {
        $set: {
          pre_location: {
            type: 'Point',
            coordinates: [parseFloat(lat), parseFloat(long)],
          },
          location: {
            type: 'Point',
            coordinates: [parseFloat(lat), parseFloat(long)],
          },
          latitude: parseFloat(lat),
          longitude: parseFloat(long),
        },
      };
      await this.userModel.updateOne({ _id: isUser._id }, update);
      const userData = { ...isUser, access_token };
      const response = new ResponseUserDto(userData);
      await validate(response, { whitelist: true });
      let data = { message: 'Login successfully.', ...response };
      return { data };
    } catch (error) {
      throw error;
    }
  }

  async generate_otp(user_id: string | Types.ObjectId) {
    try {
      let otp = '123456';
      const otpDetails = {
        otp,
        otp_expire_at: new Date(new Date().getTime() + 1 * 60000),
      };
      await this.userModel.updateOne(
        { _id: new Types.ObjectId(user_id) },
        otpDetails,
      );
    } catch (error) {
      throw error;
    }
  }

  async save_coordinates(user: any, lat: string, long: string): Promise<any> {
    try {
      let query = { _id: new Types.ObjectId(user._id) };
      let location = {
        type: 'Point',
        coordinates: [+long, +lat], // Note: MongoDB stores coordinates as [longitude, latitude]
      };
      // let direction = await this.calculatDirection(user.latitude, user.longitude, +lat, +long);
      let update = {
        $set: {
          pre_location: location,
          location,
          latitude: +lat,
          longitude: +long,
        },
      };
      return await this.userModel.findByIdAndUpdate(query, update, {
        new: true,
      });
    } catch (error) {
      throw error;
    }
  }

  async forgot_password(dto: ForgotPassword) {
    try {
      let { email } = dto;
      let query = { email: email.toLowerCase(), is_deleted: false };
      let projection = { email: 1 };
      let isUser = await this.userModel.findOne(query, projection, this.option);
      if (!isUser)
        throw new BadRequestException("User doesn't exist. Please sign-up.");
      await this.generate_otp(isUser._id);
      return { message: 'Otp sent successfully.' };
    } catch (error) {
      throw error;
    }
  }

  async verify_forgot_password(dto: VerifyForgotPassword) {
    try {
      let { email, otp } = dto;
      let query = { email: email.toLowerCase(), is_deleted: false };
      let projection = { otp: 1, otp_expire_at: 1 };
      let isUser = await this.userModel.findOne(query, projection, this.option);
      if (!isUser)
        throw new BadRequestException("User doesn't exist. Please sign-up.");
      if (new Date(isUser.otp_expire_at) < new Date())
        throw new BadRequestException('Otp expired');
      if (+isUser.otp !== +otp) throw new BadRequestException('Invalid otp');
      let access_token = await this.generateForgotPasswordToken(
        isUser._id,
        isUser.email,
        isUser.role,
      );
      return { access_token };
    } catch (error) {
      throw error;
    }
  }

  async reset_forgot_password(dto: ResetForgotPassword, user) {
    try {
      let { password } = dto;
      let hashPassword = await this.commonService.hashPassword(password);
      let query = { _id: user._id };
      let update = { password: hashPassword };
      await this.userModel.findByIdAndUpdate(query, update, this.updateOption);
      return { message: 'Password reset successfully.' };
    } catch (error) {
      throw error;
    }
  }

  async logout(dto) {
    try {
      await this.sessionModel.findByIdAndDelete({ _id: dto.session_id });
      return { message: 'Logout Successfully.' };
    } catch (error) {
      throw error;
    }
  }

  async resend_otp(dto: ResendOtp) {
    try {
      let { email } = dto;
      let query = { email: email.toLowerCase(), is_deleted: false };
      let projection = { email: 1 };
      let isUser = await this.userModel.findOne(query, projection, this.option);
      if (!isUser)
        throw new BadRequestException("User doesn't exist. Please sign-up.");
      let access_token = await this.commonService.generateTempToken(
        isUser._id,
        isUser.email,
        isUser.role,
      );
      await this.generate_otp(isUser._id);
      let data = {
        message: 'Otp sent successfully.',
        access_token,
      };
      return { data };
    } catch (error) {
      throw error;
    }
  }
}
