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
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { LineString } from 'geojson';
import {
  DriverRide,
  DriverRideDocument,
} from 'src/driver/entities/driver-ride.entity';
import { firstValueFrom } from 'rxjs';
import { BadGatewayException } from '@nestjs/common';
import * as polyline from '@mapbox/polyline';

export class LocationService {
  private option = { lean: true, sort: { _id: -1 } } as const;
  private updateOption = { new: true, sort: { _id: -1 } } as const;
  private readonly CORRIDOR_DISTANCE = 10; // meters
  private readonly DESTINATION_DISTANCE = 500; // meters
  private readonly BEARING_THRESHOLD = 65; // degrees
  private readonly SECONDARY_CORRIDOR = 12; // meters
  private readonly RESIDENTIAL_CORRIDOR = 6; // meters
  private readonly DEFAULT_CORRIDOR = 20; // meters
  private readonly GOOGLE_API_KEY: string; // meters

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
    this.GOOGLE_API_KEY = this.configService.get<string>('GOOGLE_API_KEY')!;
  }

  async findUsersAhead(
    driver: UserDocument,
    ride_id: string | Types.ObjectId,
    lat: number,
    long: number,
    radiusInKm: number,
    is_first: boolean,
  ) {
    try {
      const query = {
        _id: { $ne: new Types.ObjectId(driver._id) },
        role: 'USER',
        location: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [long, lat],
            },
            $maxDistance: radiusInKm * 1000, // Convert km to meters
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
      let ride: any = await this.driverRideModel
        .findById({ _id: ride_id })
        .lean();
      const users = await this.userModel.find(query, projection, this.option);
      let from = {
        long: (driver?.location.coordinates[0]).toString(),
        lat: (driver?.location.coordinates[1]).toString(),
      };
      let to = {
        long: ride?.drop_location.longitude.toString(),
        lat: (ride?.drop_location.latitude).toString(),
      };

      const usersToNotify: any = await Promise.all(
        users.map(async (user) => {
          let userLocation = {
            long: user.longitude.toString(),
            lat: user.latitude.toString(),
          };
          let dto = { from, to, user: userLocation };
          console.log("user, ",user._id);
          
          let { shouldAlert } = await this.calculateBearingAlert(dto);
          if (shouldAlert) {
            const token = await this.sessionModel
              .findOne({ user_id: user._id })
              .lean();
            return token;
          }
        }),
      );
      const validTokens = usersToNotify
        .filter(
          (token) =>
            token?.fcm_token !== null && token?.fcm_token !== undefined,
        )
        .map((token) => ({
          fcm_token: token?.fcm_token,
          user_id: token?.user_id,
        }));
      if (validTokens.length > 0) {
        let message = 'An ambulance is coming. Please move aside';
        let title = 'Emergency Vehicle Alert';
        await this.notificationService.send_notification(
          validTokens,
          message,
          title,
          driver._id,
          ride_id,
        );
      }
    } catch (error) {
      console.error('Error in findUsersAhead:', error);
      throw error;
    }
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

  // async calculateBearingAlert(request: BearingRequestDto) {
  //   const fromPoint = turf.point([parseFloat(request.from.long), parseFloat(request.from.lat)]);
  //   const userPoint = turf.point([parseFloat(request.user.long), parseFloat(request.user.lat)]);

  //   // Calculate distance from user to origin (from point)
  //   const distanceInKm = turf.distance(fromPoint, userPoint, { units: 'kilometers' });
  //   const distanceInMeters = distanceInKm * 1000;

  //   // Calculate bearing from origin to user
  //   const bearing = turf.bearing(fromPoint, userPoint);

  //   // Get road type information
  //   const roadInfo = await this.getRoadType(parseFloat(request.from.lat), parseFloat(request.from.long));
  //   const corridorWidth = this.getCorridorWidth(roadInfo?.type);

  //   // Create route line and buffer
  //   const routeLine = turf.lineString([
  //     [parseFloat(request.from.long), parseFloat(request.from.lat)],
  //     [parseFloat(request.to.long), parseFloat(request.to.lat)],
  //   ]);
  //   const corridorBuffer: Feature<Polygon | MultiPolygon> = turf.buffer(
  //     routeLine,
  //     corridorWidth,
  //     { units: 'meters' }
  //   ) as Feature<Polygon | MultiPolygon>;

  //   // Check conditions
  //   const isInsideCorridor = turf.booleanPointInPolygon(userPoint, corridorBuffer);
  //   const isInDistance = distanceInMeters <= this.DESTINATION_DISTANCE;
  //   const isCorrectBearing = Math.abs(bearing) <= this.BEARING_THRESHOLD;

  //   const shouldAlert = isInDistance && isCorrectBearing && isInsideCorridor;
  //   console.log("isInDistance", isInDistance);
  //   console.log("isCorrectBearing", isCorrectBearing);
  //   console.log("isInsideCorridor", isInsideCorridor);

  //   if (shouldAlert) {
  //     console.log('🚨 ALERT: User meets all conditions');
  //   }

  //   return {
  //     distanceInMeters,
  //     bearing,
  //     isInsideCorridor,
  //     shouldAlert,
  //   };
  // }

  async calculateBearingAlert(request: BearingRequestDto) {
    console.log(request,"request");
    
    const fromPoint = turf.point([
      parseFloat(request.from.long),
      parseFloat(request.from.lat),
    ]);
    const userPoint = turf.point([
      parseFloat(request.user.long),
      parseFloat(request.user.lat),
    ]);

    // Calculate distance from user to origin (from point)
    const distanceInKm = turf.distance(fromPoint, userPoint, {
      units: 'kilometers',
    });
    const distanceInMeters = distanceInKm * 1000;

    // Calculate bearing from origin to user
    const bearing = turf.bearing(fromPoint, userPoint);

    // Get road type information
    const roadInfo = await this.getRoadType(
      parseFloat(request.from.lat),
      parseFloat(request.from.long),
    );
    const corridorWidth = this.getCorridorWidth(roadInfo?.type);
    console.log("corridorWidth",corridorWidth)
    // Create route line and buffer using Google Maps Directions API
    const routeLine = await this.getRoutePath(
      { lat: parseFloat(request.from.lat), lon: parseFloat(request.from.long) },
      { lat: parseFloat(request.to.lat), lon: parseFloat(request.to.long) },
    );
    const corridorBuffer: Feature<Polygon | MultiPolygon> = turf.buffer(
      routeLine,
      corridorWidth,
      { units: 'meters' },
    ) as Feature<Polygon | MultiPolygon>;

    // Check conditions
    const isInsideCorridor = turf.booleanPointInPolygon(
      userPoint,
      corridorBuffer,
    );
    const isInDistance = distanceInMeters <= this.DESTINATION_DISTANCE;
    const isCorrectBearing = Math.abs(bearing) <= this.BEARING_THRESHOLD;

    const shouldAlert = isInDistance && isCorrectBearing && isInsideCorridor;
    console.log('isInDistance', isInDistance);
    console.log('isCorrectBearing', isCorrectBearing);
    console.log('isInsideCorridor', isInsideCorridor);

    if (shouldAlert) {
      console.log('🚨 ALERT: User meets all conditions');
    }

    return {
      distanceInMeters,
      bearing,
      isInsideCorridor,
      shouldAlert,
    };
  }

  private async getRoutePath(
    from: { lat: number; lon: number },
    to: { lat: number; lon: number },
  ): Promise<Feature<LineString>> {
    try {
      const departureTime = Math.floor(Date.now() / 1000);
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}&mode=driving&traffic_model=best_guess&departure_time=${departureTime}&key=${this.GOOGLE_API_KEY}`;
      const response = await firstValueFrom(this.httpService.get(url));

      if (response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      const route = response.data.routes[0];
      console.log('======route',route);
      const polylineEncoded = route.overview_polyline.points;
      const coordinates = polyline
        .decode(polylineEncoded)
        .map(([lat, lon]) => [lon, lat]);

      return turf.lineString(coordinates);
    } catch (error) {
      console.error('Error fetching route from Google Maps:', error);
      throw error;
    }
  }

  private async getRoadType(lat: number, lon: number) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data;
    } catch (error) {
      console.error('Error fetching road type:', error);
      return null;
    }
  }

  private getCorridorWidth(roadType?: string): number {
    switch (roadType?.toLowerCase()) {
      case 'secondary':
        return this.SECONDARY_CORRIDOR;
      case 'residential':
        return this.RESIDENTIAL_CORRIDOR;
      default:
        return this.DEFAULT_CORRIDOR;
    }
  }
}
