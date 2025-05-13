import { BadRequestException, Injectable } from '@nestjs/common';
import { AdminLoginDto, Listing, ListingDto } from './dto/create-admin.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/user/entities/user.entity';
import { FilterQuery, Model, Types } from 'mongoose';
import { Session, SessionDocument } from 'src/user/entities/session.entity';
import {Notification, NotificationDocument } from 'src/entities/notification.entity';
import { CommonService } from 'src/common/common.service';
import { ConfigService } from '@nestjs/config';
import { UserType } from 'src/common/utils';
import { DriverRide, DriverRideDocument } from 'src/driver/entities/driver-ride.entity';

@Injectable()
export class AdminService {
  private option = { lean: true } as const;
  private updateOption = { new: true } as const;
  private readonly ADMIN_EMAIL: string
  private readonly PASSWORD: string
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(DriverRide.name) private driverRideModel: Model<DriverRideDocument>,

    private commonServices: CommonService,
    private readonly configService: ConfigService,

  ) {
    this.ADMIN_EMAIL = this.configService.get<string>("ADMIN_EMAIL")!
    this.PASSWORD = this.configService.get<string>("PASSWORD")!

    this.create_admin()
  }

  async create_admin() {
    let query = { email: this.ADMIN_EMAIL.toLowerCase() }
    let is_admin = await this.userModel.findOne(query, {}, { lean: true })
    if (!is_admin) {
      let hashPassword = await this.commonServices.hashPassword(this.PASSWORD)
      let data = {
        email: this.ADMIN_EMAIL.toLowerCase(),
        password: hashPassword,
        role: UserType.ADMIN,
        createdAt: Date.now()
      }
      await this.userModel.create(data)
    }
  }

  createSession = async (user_id: string | Types.ObjectId, role: string) => {
    await this.sessionModel.deleteMany({ user_id });
    return await this.sessionModel.create({ user_id, role });
  };

  async login(dto: AdminLoginDto) {
    try {
      let { email, password } = dto;
      const query = { email: email.toLowerCase() };
      let is_admin = await this.userModel.findOne(query, {}, this.option);
      if (!is_admin) throw new BadRequestException('User not found');
      let is_password = await this.commonServices.compareHash(password, is_admin.password);
      if (!is_password) throw new BadRequestException('Incorrect password');
      let session = await this.createSession(is_admin._id, is_admin.role);
      let access_token = await this.commonServices.generateToken(is_admin._id, session._id, is_admin.email, is_admin.role);
      let data = { message: "Login SuccesFully", access_token }
      return data
    } catch (error) {
      throw error
    }

  }

  async userList(dto: Listing) {
    try {
      let { pagination, limit, search } = dto;
      let options = await this.commonServices.setOptions(pagination, limit);
      let query: FilterQuery<UserDocument> = { role: UserType.USER };
      let count = await this.userModel.countDocuments(query);
      let projection = { password: 0, role: 0 }
      if (search) {
        query.$or = [
          { first_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone_number: { $regex: search, $options: "i" } },
        ];
      }
      let users = await this.userModel.find(query, projection, options);
      let result = { count, data: users }
      return result
    } catch (error) {
      throw error
    }
  }

  async user_detail(id: string) {
    try {
      let query = { _id: new Types.ObjectId(id) }
      let projection = { password: 0, otp: 0, otp_expire_at: 0 }
      let user = await this.userModel.findById(query, projection, this.option);
      return { data: user }
    } catch (error) {
      throw error
    }
  }

  async driverList(dto: Listing) {
    try {
      let { pagination, limit, search } = dto;
      let options = await this.commonServices.setOptions(pagination, limit);
      let query: FilterQuery<UserDocument> = { role: UserType.DRIVER };
      let count = await this.userModel.countDocuments(query);
      let projection = { password: 0, role: 0 }
      if (search) {
        query.$or = [
          { first_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone_number: { $regex: search, $options: "i" } },
        ];
      }
      let drivers = await this.userModel.find(query, projection, options);
      let result = { count, data: drivers }
      return result
    } catch (error) {
      throw error
    }
  }

  async driver_ride_list(driver_id: string, dto: ListingDto) {
    try {
      let { pagination, limit } = dto;
      let options = await this.commonServices.setOptions(pagination, limit);
      let query: FilterQuery<DriverRideDocument> = { driver_id: new Types.ObjectId(driver_id)};
      let count = await this.driverRideModel.countDocuments(query);
      let projection = {}
      let rides = await this.driverRideModel.find(query, projection, options);
      let result = { count, data: rides }
      return result
    } catch (error) {
      throw error
    }
  }
}
