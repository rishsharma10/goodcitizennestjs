import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CommonService } from 'src/common/common.service';
import { NotificationService } from 'src/common/notification.service';
import { Session, SessionDocument } from 'src/user/entities/session.entity';
import { User, UserDocument } from 'src/user/entities/user.entity';
import { LatLong } from './dto/web-socket.dto';
import { firstValueFrom } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import {
  DriverRide,
  DriverRideDocument,
} from 'src/driver/entities/driver-ride.entity';

export class LocationService {
  private option = { lean: true, sort: { _id: -1 } } as const;
  private updateOption = { new: true, sort: { _id: -1 } } as const;
  private googleApiKey: string;
  private lastRouteUpdate: {
    [rideId: string]: { timestamp: number; route: any };
  } = {};

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(DriverRide.name)
    private driverRideModel: Model<DriverRideDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private commonService: CommonService,
    private notificationService: NotificationService,
    private httpService: HttpService,
  ) {
    this.googleApiKey = this.configService.get<string>('GOOGLE_API_KEY', '');
    if (!this.googleApiKey) {
      throw new Error('Google API Key not configured');
    }
  }

  async findUsersAhead(
    driver_id: string,
    ride_id: Types.ObjectId | string,
    lat: number,
    long: number,
    bearing: number,
    speed: number,
    distanceAhead: number = 1000,
    width: number = 500,
  ) {
    try {
    } catch (error) {
      console.error('Error in findUsersAhead:', error);
      throw error;
    }
  }

  async save_coordinates(
    user: any,
    payload: LatLong & { speed?: number; heading?: number },
  ) {
    try {
      
    } catch (error) {
      console.error('Error in save_coordinates:', error);
      throw new Error('Location update failed');
    }
  }
}
