import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CommonService } from 'src/common/common.service';
import { NotificationService } from 'src/common/notification.service';
import { Session, SessionDocument } from 'src/user/entities/session.entity';
import { User, UserDocument } from 'src/user/entities/user.entity';
import { BearingRequestDto, LatLong } from './dto/web-socket.dto';
import * as turf from '@turf/turf';

import {
  DriverRide,
  DriverRideDocument,
} from 'src/driver/entities/driver-ride.entity';
import { firstValueFrom } from 'rxjs';
import { BadGatewayException } from '@nestjs/common';
import { locationNow } from 'src/common/utils';
// import * as polyline from '@mapbox/polyline';
interface LatLng {
  lat: number;
  lng: number;
}
export class LocationService {
  private option = { lean: true, sort: { _id: -1 } } as const;
  private updateOption = { new: true, lean: true, sort: { _id: -1 } } as const;
  private readonly COORIDOOR_RESIDENTIAL = 6; // meters
  private readonly COORIDOOR_SECONDARY = 6; // meters
  private readonly DESTINATION_DISTANCE = 500; // meters
  private readonly BEARING_DISTANCE = 65; // meters
  private readonly GOOGLE_API_KEY: string; // meters
  // private readonly API_KEY_ROAD: string; // meters

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(DriverRide.name)
    private driverRideModel: Model<DriverRideDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationService: NotificationService,
    private httpService: HttpService,
  ) {
    this.GOOGLE_API_KEY = this.configService.get<string>('GOOGLE_API_KEY')!;
    // this.API_KEY_ROAD = this.configService.get<string>('API_KEY_ROAD')!;
  }

  async save_coordinates(user: any, payload: LatLong) {
    try {
      let { lat, long } = payload;
      let query = { _id: new Types.ObjectId(user._id) };
      const latitude = parseFloat(lat);
      const longitude = parseFloat(long);
      let location = {
        type: 'Point',
        coordinates: [longitude, latitude], // MongoDB format: [long, lat]
      };
      let update = {
        $set: {
          pre_location: user?.location || {
            type: 'Point',
            coordinates: [
              parseFloat(user.longitude || 0),
              parseFloat(user.latitude || 0),
            ],
          },
          location,
          latitude: latitude,
          longitude: longitude,
        },
      };
      let getUser = await this.userModel.findByIdAndUpdate(
        query,
        update,
        this.updateOption,
      );
      return getUser;
    } catch (error) {
      console.error('Error in save_coordinates:', error);
      throw new Error('Location update failed');
    }
  }

  // async findUsersAhead(
  //   driver: UserDocument,
  //   ride_id: string | Types.ObjectId,
  //   radiusInKm: number,
  //   is_first: boolean,
  // ) {
  //   try {
  //     const query = {
  //       _id: { $ne: new Types.ObjectId(driver._id) },
  //       role: 'USER',
  //       // location: {
  //       //   $nearSphere: {
  //       //     $geometry: {
  //       //       type: 'Point',
  //       //       coordinates: [driver.location.coordinates[0], driver.location.coordinates[1]],
  //       //     },
  //       //     $maxDistance: radiusInKm * 1000, // Convert km to meters
  //       //   },
  //       // },
  //     };

  //     const projection = {
  //       _id: 1,
  //       socket_id: 1,
  //       latitude: 1,
  //       longitude: 1,
  //       location: 1,
  //       pre_location: 1,
  //     };
  //     const users = await this.userModel.find(query, projection, this.option);
  //     let ride: any = await this.driverRideModel
  //       .findById({ _id: ride_id })
  //       .lean();
  //     let from = {
  //       long: (driver?.location.coordinates[0]).toString(),
  //       lat: (driver?.location.coordinates[1]).toString(),
  //     };
  //     let to = {
  //       long: ride?.drop_location.longitude.toString(),
  //       lat: (ride?.drop_location.latitude).toString(),
  //     };

  //     // const usersToNotify: any = await Promise.all(
  //     //   users.map(async (user) => {
  //     //     let userLocation = {
  //     //       long: user.longitude.toString(),
  //     //       lat: user.latitude.toString(),
  //     //     };
  //     //     let dto = { from, to, user: userLocation };
  //     //     console.log("user, ",user._id);

  //     //     let { shouldAlert } = await this.calculateBearingAlert(dto);
  //     //     if (shouldAlert) {
  //     //       const token = await this.sessionModel
  //     //         .findOne({ user_id: user._id })
  //     //         .lean();
  //     //       return token;
  //     //     }
  //     //   }),
  //     // );
  //     let driverpre = {
  //       lng: driver.pre_location.coordinates[0],
  //       lat: driver.pre_location.coordinates[1],
  //     };
  //     let driverNow = {
  //       lng: driver.longitude,
  //       lat: driver.latitude,
  //     };
  //     const usersToNotify: any = await Promise.all(
  //       users.map(async (user) => {
  //         let userpre = {
  //           lng: user.pre_location.coordinates[0],
  //           lat: user.pre_location.coordinates[1],
  //         };
  //         let useNow = {
  //           lng: user.longitude,
  //           lat: user.latitude,
  //         };

  //       }),
  //     );
  //     const validTokens = usersToNotify
  //       .filter(
  //         (token) =>
  //           token?.fcm_token !== null && token?.fcm_token !== undefined,
  //       )
  //       .map((token) => ({
  //         fcm_token: token?.fcm_token,
  //         user_id: token?.user_id,
  //       }));
  //     if (validTokens.length > 0) {
  //       let message = 'An ambulance is coming. Please move aside';
  //       let title = 'Emergency Vehicle Alert';
  //       await this.notificationService.send_notification(
  //         validTokens,
  //         message,
  //         title,
  //         driver._id,
  //         ride_id,
  //       );
  //     }
  //   } catch (error) {
  //     console.error('Error in findUsersAhead:', error);
  //     throw error;
  //   }
  // }

  async findUsersAhead(
    driver: UserDocument,
    ride: DriverRideDocument,
    radiusInKm: number,
    is_first: boolean,
  ) {
    try {
      console.log(
        '====',
        driver.location.coordinates[0],
        driver.location.coordinates[1],
      );

      const query = {
        _id: { $ne: new Types.ObjectId(driver._id) },
        role: 'USER',
        // location: {
        //   $nearSphere: {
        //     $geometry: {
        //       type: 'Point',
        //       coordinates: [driver.location.coordinates[0], driver.location.coordinates[1]],
        //     },
        //     $maxDistance: 5000, // Convert km to meters
        //   },
        // },
      };

      const projection = {
        _id: 1,
        socket_id: 1,
        latitude: 1,
        longitude: 1,
        location: 1,
        pre_location: 1,
      };
      const users = await this.userModel.find(query, projection, this.option);
      console.log(users, 'userrangeeeeeeeeeeeeeeeee');
      if (!users.length) return;
      let from = {
        long: (driver?.location.coordinates[0]).toString(),
        lat: (driver?.location.coordinates[1]).toString(),
      };
      let to = {
        long: (ride?.drop_location.longitude).toString(),
        lat: (ride?.drop_location.latitude).toString(),
      };
      let API_KEY_ROAD =
        '5b3ce3597851110001cf62484419ae65a9fe45aead63bcf4d68328e1';
      try {
        const response = await fetch(
          `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${API_KEY_ROAD}&start=${from.long},${from.lat}&end=${to.long},${to.lat}`,
        );
        const data = await response.json();
        var coordinates = data?.features[0]?.geometry?.coordinates;
        console.log(coordinates, 'coordinates___________');
      } catch (error) {
        console.log('openrouteservice', error);

        throw error;
      }
      const line = turf.lineString(coordinates);
      const buffer: any = turf.buffer(line, this.COORIDOOR_SECONDARY, {
        units: 'meters',
      });
      console.log(buffer, 'buffer_____');

      let driverNow: locationNow = {
        long: driver?.location.coordinates[0],
        lat: driver?.location.coordinates[1],
      };

      const userArr = [
        {
          lat: 30.71555,
          lon: 76.692073,
        },
        {
          lat: 30.715822,
          lon: 76.692525,
        },
        {
          name: 'dwivedi',
          lat: 30.7311562,
          lon: 76.6950311,
        },
        {
          name: 'sulo',
          lat: 30.730963,
          lon: 76.695686,
        },
      ];

      const results = users
        .map((user: any) => {
          if (!user.latitude || !user.longitude) return null;

          const userPoint = turf.point([user.longitude, user.latitude]);

          const distanceInKm = turf.distance(
            turf.point([+from.long, +from.lat]),
            userPoint,
            { units: 'kilometers' },
          );
          const distanceInMeters = distanceInKm * 1000;

          const bearing = turf.bearing(
            turf.point([+from.long, +from.lat]),
            userPoint,
          );
          const isInsideCorridor = turf.booleanPointInPolygon(
            userPoint,
            buffer,
          );

          const isInDistance = distanceInMeters <= this.DESTINATION_DISTANCE;
          const isBearing = bearing <= this.BEARING_DISTANCE;
          const directionMatch = this.isUserInSameDirection(
            [+from.long, +from.lat],
            [user.longitude, user.latitude],
          );

          const shouldAlert = isInDistance && isBearing && isInsideCorridor;
          const data = {
            user: user,
            distanceInMeters,
            bearing,
            isInsideCorridor,
            directionMatch,
            shouldAlert,
          };
           this.sendNotification(data, driver, ride);
          // return data
        })
        .filter(Boolean);
        await this.driverRideModel.updateOne({_id:ride._id},{last_notification: new Date(),})
      // const usersToNotify: any = await Promise.all(
      //   users.filter(user => !!user && user.longitude && user.latitude)
      //   .map(async (user) => {
      //     if(!user.longitude || !user.latitude) return
      //     let userNow: locationNow = {
      //       long: user.longitude,
      //       lat: user.latitude,
      //     };
      //     let shouldAlert = await this.isUSerAhead(userNow, driverNow, buffer)
      //     if (shouldAlert) {
      //       const token = await this.sessionModel.findOne({ user_id: user._id }).lean();
      //       return token;
      //     }
      //   }),
      // );
      // console.log("usernotify", usersToNotify);

      // const validTokens = usersToNotify
      //   .filter(
      //     (token) =>
      //       token?.fcm_token !== null && token?.fcm_token !== undefined,
      //   )
      //   .map((token) => ({
      //     fcm_token: token?.fcm_token,
      //     user_id: token?.user_id,
      //   }));
      // if (validTokens.length > 0) {
      //   let message = 'An ambulance is coming. Please move aside';
      //   let title = 'Emergency Vehicle Alert';
      //   await this.notificationService.send_notification(
      //     validTokens,
      //     message,
      //     title,
      //     driver._id,
      //     ride._id.toString(),
      //   );
      // }
    } catch (error) {
      console.error('Error in findUsersAhead:', error);
      throw error;
    }
  }

  async isUSerAhead(user: locationNow, from: locationNow, buffer) {
    try {
      console.log(user, 'user');
      console.log(from, 'from');
      console.log(buffer, 'buffer');

      const userPoint = turf.point([user.long, user.lat]);
      const distanceInKm = turf.distance(
        turf.point([from.long, from.lat]),
        userPoint,
        { units: 'kilometers' },
      );
      const distanceInMeters = distanceInKm * 1000;
      const bearing = turf.bearing(
        turf.point([from.long, from.lat]),
        userPoint,
      );
      const isInsideCorridor = turf.booleanPointInPolygon(userPoint, buffer);
      const isInDistance = distanceInMeters <= this.DESTINATION_DISTANCE;
      const isBearing = bearing <= this.BEARING_DISTANCE;
      const directionMatch = await this.isUserInSameDirection(
        [from.long, from.lat],
        [user.long, user.lat],
      );
      const shouldAlert = isInDistance && isBearing && isInsideCorridor;
      return {
        coordinates: user,
        distanceInMeters,
        bearing,
        isInsideCorridor,
        directionMatch,
        shouldAlert,
      };
    } catch (error) {
      console.log(error, 'is user aheaderror');
      throw error;
    }
  }

  // async isUserInSameDirection(driverCoord: [number, number], userCoord: [number, number]): Promise<boolean> {
  //   try {
  //     const from = turf.point(driverCoord); // [lon, lat]
  //     const to = turf.point(userCoord); // [lon, lat]

  //     const bearing = turf.bearing(from, to);
  //     const driverBearing = 0; // Replace with actual bearing if known

  //     const angleDiff = Math.abs(bearing - driverBearing) % 360;
  //     const smallestAngle = angleDiff > 180 ? 360 - angleDiff : angleDiff;

  //     return smallestAngle <= 45;
  //   } catch (error) {
  //     console.log(error,"isUserInSameDirection");
  //     throw error
  //   }
  // }

  async sendNotification(
    data: any,
    driver: UserDocument,
    ride: DriverRideDocument,
  ) {
    console.log(data, 'usersendnotificationnnn___');
    let shouldAlert = data.shouldAlert;
    if (shouldAlert) {
      const notificationToken: any = await this.sessionModel
        .findOne({ user_id: data.user._id })
        .lean();
        console.log(notificationToken,'notificationToken________________________________')

        if(notificationToken){
          let message = 'An ambulance is coming. Please move aside';
          let title = 'Emergency Vehicle Alert';
          await this.notificationService.send_notification(
            notificationToken,
            message,
            title,
            driver._id,
            ride._id.toString(),
          );
        }
     
      // return token;
    }
  }

  async isUserInSameDirection(
    driverCoord: [number, number],
    userCoord: [number, number],
  ): Promise<boolean> {
    const from = turf.point(driverCoord); // [lon, lat]
    const to = turf.point(userCoord); // [lon, lat]

    const bearing = turf.bearing(from, to);
    const driverBearing = 0; // Replace with actual bearing if known

    const angleDiff = Math.abs(bearing - driverBearing) % 360;
    const smallestAngle = angleDiff > 180 ? 360 - angleDiff : angleDiff;

    return smallestAngle <= 45;
  }
}
