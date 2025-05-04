import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CommonService } from 'src/common/common.service';
import { NotificationService } from 'src/common/notification.service';
import { Session, SessionDocument } from 'src/user/entities/session.entity';
import { User, UserDocument } from 'src/user/entities/user.entity';
import { LatLong } from './dto/web-socket.dto';
import { DriverRide, DriverRideDocument } from 'src/driver/entities/driver-ride.entity';

export class LocationService {
  private option = { lean: true, sort: { _id: -1 } } as const;
  private updateOption = { new: true, sort: { _id: -1 } } as const;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(DriverRide.name) private driverModel: Model<DriverRideDocument>,
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
    speed: number, // Added speed parameter
    distanceAhead: number = 1000, // Default: 1 km ahead
    coneAngle: number = 60, // Default: 60-degree cone
  ) {
    try {
      console.log('findUsersAhead');

      // Adjust cone angle and bearing based on speed
      let effectiveConeAngle = coneAngle;
      let notificationBearing = bearing;
      if (speed < 1) { // If speed < 1 m/s, use destination bearing and wider cone
        effectiveConeAngle = 90; // Wider angle when stationary
        const ride = await this.driverModel.findById(ride_id).lean();
        if (ride && ride.drop_location) {
          const dropLat = ride.drop_location.latitude;
          const dropLong = ride.drop_location.longitude;
          notificationBearing = this.calculateBearing(lat, long, dropLat, dropLong);
        }
      }

      // Calculate the two points forming the base of the triangle
      const halfAngle = effectiveConeAngle / 2;
      const pointA = this.calculatePointAtDistance(
        lat,
        long,
        distanceAhead,
        notificationBearing - halfAngle,
      );
      const pointB = this.calculatePointAtDistance(
        lat,
        long,
        distanceAhead,
        notificationBearing + halfAngle,
      );

      // Define the polygon (triangle: current position, pointA, pointB)
      const polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [long, lat], // Apex at ambulance’s current position
            [pointA[0], pointA[1]], // Left vertex
            [pointB[0], pointB[1]], // Right vertex
            [long, lat], // Close the polygon
          ],
        ],
      };

      // Find users within the polygon or within 50 meters
      const users = await this.userModel.aggregate([
        {
          $match: {
            $or: [
              {
                location: {
                  $geoWithin: {
                    $geometry: polygon,
                  },
                },
              },
              {
                location: {
                  $near: {
                    $geometry: { type: 'Point', coordinates: [long, lat] },
                    $maxDistance: 50, // 50 meters minimum radius
                  },
                },
              },
            ],
            _id: { $ne: new Types.ObjectId(driver_id) }, // Exclude the driver
            role: 'USER',
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
          },
        },
      ]);

      console.log('users', users);

      // Send notifications to found users
      if (users?.length > 0) {
        const tokens = users.map((u) => u?.fcm_token).filter(Boolean);
        const message = 'An ambulance is approaching. Please move aside.';
        const title = 'Emergency Vehicle Alert';
        await this.notificationService.send_notification(
          tokens,
          message,
          title,
          driver_id,
          ride_id,
        );
      }

      console.log(`Notified ${users.length} users for ride ${ride_id}`);
    } catch (error) {
      console.error('Error in findUsersAhead:', error);
      throw error;
    }
  }

  private calculatePointAtDistance(
    lat: number,
    long: number,
    distanceMeters: number,
    bearingDegrees: number,
  ): [number, number] {
    const R = 6378137; // Earth radius in meters
    const δ = distanceMeters / R; // Angular distance
    const θ = bearingDegrees * (Math.PI / 180);

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
      ((λ2 * (180 / Math.PI) + 540) % 360) - 180, // Normalize longitude to -180 to 180
      φ2 * (180 / Math.PI), // Latitude
    ];
  }

  async save_coordinates(
    user: any,
    payload: LatLong,
  ): Promise<{ driver: any; driverBearing: number; driverSpeed: number }> { // Added driverSpeed
    try {
      console.log('save_coordinates');

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
        driverSpeed: movementMetrics.speed, // Return speed
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
    const φ1 = (startLat * Math.PI) / 180;
    const λ1 = (startLng * Math.PI) / 180;
    const φ2 = (endLat * Math.PI) / 180;
    const λ2 = (endLng * Math.PI) / 180;

    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);

    let θ = Math.atan2(y, x);
    const bearing = ((θ * 180) / Math.PI + 360) % 360;

    console.log(
      `Bearing from (${startLat},${startLng}) to (${endLat},${endLng}): ${bearing.toFixed(2)}°`,
    );
    return bearing;
  }
}