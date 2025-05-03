import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CommonService } from 'src/common/common.service';
import { NotificationService } from 'src/common/notification.service';
import { Session, SessionDocument } from 'src/user/entities/session.entity';
import { User, UserDocument } from 'src/user/entities/user.entity';
import { LatLong } from './dto/web-socket.dto';

export class LocationService {
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

  async findUsersAhead(
    driver_id: string,
    ride_id: Types.ObjectId | string,
    lat: number,
    long: number,
    bearing: number,
    radiusInKm: number,
  ) {
    try {
      // 1. Calculate future position projection
      const futurePoint = this.calculateFuturePosition(
        [long, lat],
        bearing,
        5.5556, // 20 km/h in m/s
        180, // 180 seconds to reach 1 km
      );

      // 2. Find users in projected path
      const users = await this.userModel.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: futurePoint },
            distanceField: 'distance',
            maxDistance: radiusInKm * 1000,
            query: {
              _id: { $ne: new Types.ObjectId(driver_id) },
              role: 'USER',
              //   last_notified: { $lt: new Date(Date.now() - 300000) }, // 5 min cooldown
            },
            spherical: true,
          },
        },
        {
          $addFields: {
            bearingDiff: {
              $abs: { $subtract: ['$current_bearing', bearing] },
            },
          },
        },
        {
          $match: {
            $or: [
              { bearingDiff: { $lte: 15 } }, // 30° total cone (15° each side)
              { bearingDiff: { $gte: 345 } },
            ],
          },
        },
        {
          $lookup: {
            from: 'sessions',
            localField: '_id',
            foreignField: 'user_id',
            as: 'session',
          },
        },
        {
          $unwind: '$session',
        },
        {
          $project: {
            fcm_token: '$session.fcm_token',
            _id: 1,
            distance: 1,
          },
        },
      ]);

      // 3. Send notifications and update timestamps
      if (users.length > 0) {
        const tokens = users.map((u) => u?.fcm_token).filter(Boolean);
        let message = 'An ambulance is coming. Please move aside';
        let title = 'Emergency Vehicle Alert';
        await this.notificationService.send_notification(
          tokens,
          message,
          title,
          driver_id,
          ride_id,
        );
        await this.userModel.updateMany(
          { _id: { $in: users.map((u) => u._id) } },
          { $set: { last_notified: new Date() } },
        );
      }

      console.log(`Notified ${users.length} users for ride ${ride_id}`);
    } catch (error) {
      console.error('Error in findUsersAhead:', error);
      throw error;
    }
  }

  async save_coordinates(
    user: any,
    payload: LatLong,
  ): Promise<{ driver: any; driverBearing: number }> {
    try {
      const { lat, long } = payload;
      const query = { _id: new Types.ObjectId(user._id) };

      // Validate and parse coordinates
      const latitude = this.validateCoordinate(parseFloat(lat), 90);
      const longitude = this.validateCoordinate(parseFloat(long), 180);

      const newLocation = {
        type: 'Point',
        coordinates: [longitude, latitude], // MongoDB format: [long, lat]
      };

      // Calculate movement metrics
      const movementMetrics = await this.calculateMovementMetrics(
        user,
        latitude,
        longitude,
      );

      const update = {
        $set: {
          pre_location: user.location || newLocation,
          location: newLocation,
          current_bearing: movementMetrics.bearing,
          last_location_update: new Date(),
          ...(movementMetrics.speed > 0.5 && {
            current_speed: movementMetrics.speed,
          }),
        },
      };

      const updatedUser = await this.userModel.findByIdAndUpdate(
        query,
        update,
        {
          new: true,
          projection: { fcm_token: 0, password: 0 },
        },
      );

      return {
        driver: updatedUser,
        driverBearing: movementMetrics.bearing,
      };
    } catch (error) {
      console.error('Error in save_coordinates:', error);
      throw new Error('Location update failed');
    }
  }

  private validateCoordinate(value: number, max: number): number {
    if (isNaN(value) || Math.abs(value) > max) {
      throw new Error(`Invalid coordinate value: ${value}`);
    }
    return value;
  }

  private calculateFuturePosition(
    [long, lat]: [number, number],
    bearing: number,
    speedMps: number,
    projectionSeconds: number,
  ): [number, number] {
    const R = 6378137; // Earth radius in calculateFuturePositionmeters
    const δ = (speedMps * projectionSeconds) / R;
    const θ = bearing * (Math.PI / 180);

    const φ1 = lat * (Math.PI / 180);
    const λ1 = long * (Math.PI / 180);

    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
    );

    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
      );

    return [
      λ2 * (180 / Math.PI), // longitude
      φ2 * (180 / Math.PI), // latitude
    ];
  }

  private async calculateMovementMetrics(
    user: any,
    newLat: number,
    newLng: number,
  ) {
    const MIN_MOVEMENT = 5; // meters
    const defaultMetrics = { bearing: user.current_bearing || 0, speed: 0 };

    if (!user.pre_location?.coordinates) return defaultMetrics;

    const [prevLng, prevLat] = user.pre_location.coordinates;
    const distanceMoved = this.calculateHaversineDistance(
      [prevLat, prevLng],
      [newLat, newLng],
    );

    if (distanceMoved < MIN_MOVEMENT) return defaultMetrics;

    const timeDiff = (Date.now() - user.last_location_update?.getTime()) / 1000;
    const bearing = this.calculateBearing(prevLat, prevLng, newLat, newLng);
    const speed = timeDiff > 0 ? distanceMoved / timeDiff : 0;

    return { bearing, speed };
  }

  private calculateHaversineDistance(
    coord1: [number, number],
    coord2: [number, number],
  ): number {
    const [lat1, lon1] = coord1;
    const [lat2, lon2] = coord2;

    const R = 6378137; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private calculateBearing(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ): number {
    // Convert degrees to radians
    const φ1 = (startLat * Math.PI) / 180;
    const λ1 = (startLng * Math.PI) / 180;
    const φ2 = (endLat * Math.PI) / 180;
    const λ2 = (endLng * Math.PI) / 180;

    // Calculate bearing components
    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);

    // Calculate initial bearing
    let θ = Math.atan2(y, x);

    // Convert to degrees and normalize (0-360)
    const bearing = ((θ * 180) / Math.PI + 360) % 360;

    console.log(
      `Bearing from (${startLat},${startLng}) to (${endLat},${endLng}): ${bearing.toFixed(2)}°`,
    );
    return bearing;
  }
}
