import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from 'src/user/entities/user.entity';
import { Session, SessionDocument } from 'src/user/entities/session.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CommonService } from 'src/common/common.service';
import { LatLong } from './dto/web-socket.dto';
import { DIRECTION } from 'src/common/utils';
import { NotificationService } from 'src/common/notification.service';

@Injectable()
export class WebSocketService {
  private option = { lean: true, sort: { _id: -1 } } as const;
  private updateOption = { new: true, sort: { _id: -1 } } as const;
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private commonService: CommonService,
    private notificationService: NotificationService,
  ) {}
  async handleConnection(token: string, socket_id) {
    try {
      const decoded = await this.commonService.decodeToken(token);
      const session = await this.sessionModel.findById(
        { _id: new Types.ObjectId(decoded.session_id) },
        {},
        this.updateOption,
      );
      if (!session) throw new UnauthorizedException();
      let user_id = session.user_id;
      let update = { is_online: true, socket_id };
      let user = await this.userModel.findByIdAndUpdate(
        { _id: new Types.ObjectId(user_id) },
        update,
        this.option,
      );
      if (!user) throw new UnauthorizedException();
      return user;
    } catch (error) {
      throw error;
    }
  }

  async handleDisconnect(user_id: string) {
    try {
      let update = { is_online: false };
      await this.userModel.updateOne(
        { _id: new Types.ObjectId(user_id) },
        update,
      );
      return;
    } catch (error) {
      throw error;
    }
  }

  // async save_coordinates(user: any, payload: LatLong): Promise<any> {
  //   try {
  //     let { lat, long } = payload;
  //     let query = { _id: new Types.ObjectId(user._id) };
  //     let location = {
  //       type: 'Point',
  //       coordinates: [parseFloat(long), parseFloat(lat)], // Note: MongoDB stores coordinates as [longitude, latitude]
  //     };
  //     const [prevLong, prevLat] = user.pre_location.coordinates;

  //     let driverBearing = await this.calculateBearing(
  //       prevLat,
  //       prevLong,
  //       +lat,
  //       +long,
  //     );
  //     let update = {
  //       $set: {
  //         pre_location: user?.location || {
  //           type: 'Point',
  //           coordinates: [
  //             parseFloat(user.longitude),
  //             parseFloat(user.latitude),
  //           ],
  //         },
  //         location,
  //         latitude: parseFloat(lat),
  //         longitude: parseFloat(long),
  //         // direction
  //       },
  //     };
  //     console.log(update, 'update');
  //     let getUser = await this.userModel.findByIdAndUpdate(query, update, {
  //       new: true,
  //     });
  //     return { driver: getUser, driverBearing };
  //   } catch (error) {
  //     console.log('erorooooo', error);

  //     throw error;
  //   }
  // }

  async save_coordinates(user: any, payload: LatLong): Promise<any> {
    try {
      let { lat, long } = payload;
      let query = { _id: new Types.ObjectId(user._id) };

      // Convert strings to numbers if needed
      const latitude = parseFloat(lat);
      const longitude = parseFloat(long);

      let location = {
        type: 'Point',
        coordinates: [longitude, latitude], // MongoDB format: [long, lat]
      };

      // Calculate bearing only if we have valid previous coordinates
      let driverBearing = 0;
      if (
        user.pre_location &&
        Array.isArray(user.pre_location.coordinates) &&
        user.pre_location.coordinates.length === 2
      ) {
        const [prevLong, prevLat] = user.pre_location.coordinates;

        // Only calculate bearing if movement is significant enough (to avoid erratic values)
        const distanceMoved = this.calculateDistance(
          prevLat,
          prevLong,
          latitude,
          longitude,
        );
        if (distanceMoved > 0.005) {
          // Minimum 5 meters movement to calculate bearing
          driverBearing = await this.calculateBearing(
            prevLat,
            prevLong,
            latitude,
            longitude,
          );
        } else {
          // Keep previous bearing if movement is too small
          driverBearing = user.current_bearing || 0;
        }
      }

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
          current_bearing: driverBearing, // Store current bearing for future reference
          last_location_update: new Date(),
        },
      };

      let getUser = await this.userModel.findByIdAndUpdate(query, update, {
        new: true,
      });

      return { driver: getUser, driverBearing };
    } catch (error) {
      console.error('Error in save_coordinates:', error);
      throw error;
    }
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // async findUsersAhead(
  //   driver_id: string,
  //   ride_id: string | Types.ObjectId,
  //   lat: number,
  //   long: number,
  //   bearing: number, // Driver's movement angle
  //   radiusInKm: number,
  //   is_first: boolean,
  // ) {
  //   try {
  //     const radiusInRadians = radiusInKm / 6378.1; // Convert km to radians

  //     // Query: Get users within the radius, excluding the driver
  //     let query = {
  //       _id: { $ne: new Types.ObjectId(driver_id) },
  //       role: 'USER',
  //       location: {
  //         $geoWithin: {
  //           $centerSphere: [[long, lat], radiusInRadians],
  //         },
  //       },
  //     };

  //     const projection = {
  //       _id: 1,
  //       socket_id: 1,
  //       latitude: 1,
  //       longitude: 1,
  //       pre_location: 1,
  //     };

  //     // Fetch users in range
  //     const users = await this.userModel.find(query, projection, this.option);
  //     console.log(`Found ${users.length} users within ${radiusInKm} km radius`);

  //     const usersAheadTokens = await Promise.all(
  //       users.map(async (user) => {
  //         console.log('user----', user);

  //         if (
  //           !user.pre_location ||
  //           !Array.isArray(user.pre_location.coordinates)
  //         )
  //           return null;

  //         const [prevLong, prevLat] = user.pre_location.coordinates;
  //         const userBearing = await this.calculateBearing(
  //           prevLat,
  //           prevLong,
  //           user.latitude,
  //           user.longitude,
  //         );
  //         const token = await this.sessionModel
  //           .findOne({ user_id: user._id })
  //           .lean();

  //         // Users are ahead if they are within a 60° cone in front of the driver
  //         const directionDifference = await this.getAngleDifference(
  //           userBearing,
  //           bearing,
  //         );
  //         console.log(`driverBearing`, bearing);
  //         console.log(`userBearing ${user._id}`, userBearing);
  //         console.log(`directionDifference`, directionDifference);

  //         if (is_first) {
  //           return token;
  //         }
  //         return directionDifference <= 60 ? token : null;
  //       }),
  //     );
  //     console.log('usersAheadTokens', usersAheadTokens);

  //     // Filter out null values
  //     const validTokens = usersAheadTokens
  //       .filter((token) => token?.fcm_token !== null)
  //       .map((token) => ({
  //         fcm_token: token?.fcm_token,
  //         user_id: token?.user_id,
  //       }));

  //     console.log('validTokens', validTokens);

  //     let message = 'An ambulane is coming. Please move aside';
  //     let title = 'Good Citizen Alert';
  //     await this.notificationService.send_notification(
  //       validTokens,
  //       message,
  //       title,
  //       driver_id,
  //       ride_id,
  //     );
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  // Calculate the bearing between two latitude/longitude points

  async findUsersAhead(
    driver_id: string,
    ride_id: string | Types.ObjectId,
    lat: number,
    long: number,
    bearing: number, // Driver's movement angle
    radiusInKm: number,
    is_first: boolean,
  ) {
    try {
      const radiusInRadians = radiusInKm / 6378.1; // Convert km to radians

      // Query: Get users within the radius, excluding the driver
      let query = {
        _id: { $ne: new Types.ObjectId(driver_id) },
        role: 'USER',
        location: {
          $geoWithin: {
            $centerSphere: [[long, lat], radiusInRadians],
          },
        },
      };

      const projection = {
        _id: 1,
        socket_id: 1,
        latitude: 1,
        longitude: 1,
        pre_location: 1,
      };

      // Fetch users in range
      const users = await this.userModel.find(query, projection, this.option);
      console.log(`Found ${users.length} users within ${radiusInKm} km radius`);

      const usersToNotify = await Promise.all(
        users.map(async (user) => {
          // 1. Calculate bearing FROM driver TO user (this tells us direction to the user)
          const bearingToUser = await this.calculateBearing(
            lat, // driver latitude
            long, // driver longitude
            user.latitude, // user latitude
            user.longitude, // user longitude
          );

          // 2. Determine if user is ahead of driver by comparing bearingToUser with driver's bearing
          // If user is in the general direction the driver is moving, they're ahead
          const angleDiffToUser = await this.getAngleDifference(
            bearingToUser,
            bearing,
          );
          const isUserAhead = angleDiffToUser <= 60; // User is within a 60° cone ahead of driver

          // 3. If we have user's previous coordinates, determine if they're moving in same direction
          let userBearing;
          let isMovingSameDirection = false;

          if (
            user.pre_location &&
            Array.isArray(user.pre_location.coordinates)
          ) {
            const [prevLong, prevLat] = user.pre_location.coordinates;

            // Only calculate if there's meaningful movement
            const distanceMoved = this.calculateDistance(
              prevLat,
              prevLong,
              user.latitude,
              user.longitude,
            );

            if (distanceMoved > 0.005) {
              // 5 meters minimum to avoid GPS jitter
              userBearing = await this.calculateBearing(
                prevLat,
                prevLong,
                user.latitude,
                user.longitude,
              );

              // Compare user's movement direction with driver's direction
              const directionDifference = await this.getAngleDifference(
                userBearing,
                bearing,
              );
              isMovingSameDirection = directionDifference <= 45; // Within 45° of driver's direction

              console.log(`User ${user._id}:`);
              console.log(`  Driver bearing: ${bearing}°`);
              console.log(`  User bearing: ${userBearing}°`);
              console.log(`  Direction difference: ${directionDifference}°`);
              console.log(
                `  Is moving same direction: ${isMovingSameDirection}`,
              );
            }
          }

          console.log(`User ${user._id}:`);
          console.log(`  Bearing to user: ${bearingToUser}°`);
          console.log(`  Angle diff to user: ${angleDiffToUser}°`);
          console.log(`  Is ahead: ${isUserAhead}`);

          // Get user's token
          const token = await this.sessionModel
            .findOne({ user_id: user._id })
            .lean();

          // 4. Decision logic for notification
          let shouldNotify = false;
          if (isUserAhead) {
            // Regular notification - user must be ahead
            // Prioritize users moving in same direction, but notify all ahead users
            shouldNotify = true;
          }

          return shouldNotify ? token : null;
        }),
      );

      // Filter out null values
      const validTokens = usersToNotify
        .filter((token) => token?.fcm_token !== null)
        .map((token) => ({
          fcm_token: token?.fcm_token,
          user_id: token?.user_id,
        }));

      console.log('Found valid tokens:', validTokens.length);

      if (validTokens.length > 0) {
        let message = 'An ambulance is coming. Please move aside';
        let title = 'Emergency Vehicle Alert';
        await this.notificationService.send_notification(
          validTokens,
          message,
          title,
          driver_id,
          ride_id,
        );
      }
    } catch (error) {
      console.error('Error in findUsersAhead:', error);
      throw error;
    }
  }

  async calculateBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const toRadians = (deg: number) => (deg * Math.PI) / 180;
    const toDegrees = (rad: number) => (rad * 180) / Math.PI;

    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δλ = toRadians(lon2 - lon1);

    const x = Math.sin(Δλ) * Math.cos(φ2);
    const y =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    let θ = Math.atan2(x, y);
    return (toDegrees(θ) + 360) % 360; // Normalize to 0-360 degrees
  }

  // Get the smallest angle difference (accounting for 360-degree wraparound)
  async getAngleDifference(angle1: number, angle2: number) {
    const diff = Math.abs(angle1 - angle2) % 360;
    return diff > 180 ? 360 - diff : diff;
  }
}
