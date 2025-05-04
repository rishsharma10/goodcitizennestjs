import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CommonService } from 'src/common/common.service';
import { NotificationService } from 'src/common/notification.service';
import { Session, SessionDocument } from 'src/user/entities/session.entity';
import { User, UserDocument } from 'src/user/entities/user.entity';
import { LatLong } from './dto/web-socket.dto';
import {
  DriverRide,
  DriverRideDocument,
} from 'src/driver/entities/driver-ride.entity';

interface MovementMetrics {
  bearing: number;
  speed: number;
}

interface DriverLocationResult {
  driver: UserDocument;
  driverBearing: number;
  driverSpeed: number;
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly option = { lean: true, sort: { _id: -1 } } as const;
  private readonly updateOption = { new: true, sort: { _id: -1 } } as const;
  private readonly EARTH_RADIUS = 6378137; // Earth radius in meters
  private readonly MIN_MOVEMENT = 5; // meters

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(DriverRide.name)
    private driverModel: Model<DriverRideDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private commonService: CommonService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Find users ahead of a driver and notify them
   * IMPORTANT: This is your original function name maintained for compatibility
   */
  async findUsersAhead(
    driver_id: Types.ObjectId | string,
    ride_id: Types.ObjectId | string,
    lat: number,
    long: number,
    bearing: number,
    speed: number,
    distanceAhead: number = 1000,
    coneAngle: number = 60,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Finding users ahead of driver ${driver_id} for ride ${ride_id}`,
      );

      // Get the ambulance ride details for route information
      const ride = await this.driverModel.findById(ride_id).lean();

      // Find users using two complementary methods
      const [directionalUsers, nearbyUsers] = await Promise.all([
        // 1. Directional search - users in the path ahead
        this.findUsersInDirectionalPath(
          driver_id,
          ride,
          lat,
          long,
          bearing,
          speed,
          distanceAhead,
          coneAngle,
        ),

        // 2. Proximity search - users very close to the ambulance regardless of direction
        this.findNearbyUsers(driver_id, lat, long, 50), // 50 meters radius
      ]);

      // Combine both sets of users, removing duplicates
      const allUsers = [...directionalUsers];
      for (const user of nearbyUsers) {
        if (!allUsers.some((u) => u._id.toString() === user._id.toString())) {
          allUsers.push(user);
        }
      }

      this.logger.debug(
        `Found ${allUsers.length} users to notify (${directionalUsers.length} directional, ${nearbyUsers.length} nearby)`,
      );

      // Send notifications to found users
      if (allUsers.length > 0) {
        const tokens = allUsers.map((u) => u.fcm_token).filter(Boolean);

        if (tokens.length > 0) {
          const message = 'An ambulance is approaching. Please move aside.';
          const title = 'Emergency Vehicle Alert';

          await this.notificationService.send_notification(
            tokens,
            message,
            title,
            driver_id,
            ride_id,
          );

          this.logger.log(
            `Notified ${tokens.length} users for ride ${ride_id}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in findUsersAhead: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find users in the directional path ahead of the ambulance
   */
  private async findUsersInDirectionalPath(
    driver_id: Types.ObjectId | string,
    ride: any,
    lat: number,
    long: number,
    bearing: number,
    speed: number,
    distanceAhead: number,
    coneAngle: number,
  ): Promise<any[]> {
    try {
      console.log("findUsersInDirectionalPath--called");

      // Adjust parameters based on speed and context
      let effectiveConeAngle = coneAngle;
      let effectiveDistance = distanceAhead;
      let notificationBearing = bearing;

      // Adjust for low speed scenarios
      if (speed < 1) {
        effectiveConeAngle = 90; // Wider cone when slow/stopped

        // If we have a destination, use that for direction instead of current bearing
        if (ride?.drop_location) {
          const dropLat = ride.drop_location.latitude;
          const dropLong = ride.drop_location.longitude;
          notificationBearing = this.calculateBearing(
            lat,
            long,
            dropLat,
            dropLong,
          );
        }
      } else {
        // For higher speeds, look further ahead based on speed
        // At higher speeds, we want to notify people further ahead
        effectiveDistance = Math.max(distanceAhead, speed * 15); // Look ~15 seconds ahead
      }

      // Create a search polygon based on route if available, otherwise use a cone
      let searchArea;

      if (ride?.route && Array.isArray(ride.route) && ride.route.length > 1) {
        // Use route-based search area if available
        searchArea = this.createRouteBasedSearchArea(
          ride.route,
          [long, lat],
          effectiveDistance,
        );
      } else {
        // Use directional cone if no route available
        searchArea = this.createDirectionalCone(
          lat,
          long,
          notificationBearing,
          effectiveDistance,
          effectiveConeAngle,
        );
      }

      // Find users within the search area with valid FCM tokens
      const users = await this.userModel.aggregate([
        {
          $match: {
            location: {
              $geoWithin: {
                $geometry: searchArea,
              },
            },
            _id: { $ne: new Types.ObjectId(driver_id) },
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
          $unwind: {
            path: '$session',
            preserveNullAndEmptyArrays: false, // Only include users with sessions
          },
        },
        {
          $match: {
            'session.fcm_token': { $exists: true, $ne: null },
          },
        },
        {
          $project: {
            _id: 1,
            fcm_token: '$session.fcm_token',
          },
        },
      ]);

      return users;
    } catch (error) {
      this.logger.error(
        `Error finding directional users: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Find nearby users regardless of direction
   */
  private async findNearbyUsers(
    driver_id: string | Types.ObjectId,
    lat: number,
    long: number,
    radiusMeters: number,
  ): Promise<any[]> {
    try {
      console.log("findNearbyUsers--called");
      const users = await this.userModel.aggregate([
        {
          $match: {
            location: {
              $geoWithin: {
                $centerSphere: [
                  [long, lat], 
                  radiusMeters / 6378000 // Convert meters to radians (Earth radius = ~6378 km)
                ]
              }
            },
            _id: { $ne: new Types.ObjectId(driver_id) },
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
          $unwind: {
            path: '$session',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $match: {
            'session.fcm_token': { $exists: true, $ne: null },
          },
        },
        {
          $project: {
            _id: 1,
            fcm_token: '$session.fcm_token',
          },
        },
      ]);

      return users;
    } catch (error) {
      this.logger.error(
        `Error finding nearby users: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Create a directional cone for searching users ahead
   */
  private createDirectionalCone(
    lat: number,
    long: number,
    bearing: number,
    distance: number,
    coneAngle: number,
  ): any {
    // Calculate the half-angle for the cone
    const halfAngle = coneAngle / 2;

    // Calculate points for the cone
    const pointA = this.calculatePointAtDistance(
      lat,
      long,
      distance,
      bearing - halfAngle,
    );

    const pointB = this.calculatePointAtDistance(
      lat,
      long,
      distance,
      bearing + halfAngle,
    );

    // Define the polygon (triangle: current position, pointA, pointB)
    return {
      type: 'Polygon',
      coordinates: [
        [
          [long, lat], // Apex at ambulance's current position
          [pointA[0], pointA[1]], // Left vertex
          [pointB[0], pointB[1]], // Right vertex
          [long, lat], // Close the polygon
        ],
      ],
    };
  }

  /**
   * Create a search area based on the ambulance's route
   */
  private createRouteBasedSearchArea(
    route: any[],
    currentPosition: [number, number],
    lookAheadDistance: number,
  ): any {
    try {
      // Find where we are on the route
      let closestPointIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < route.length; i++) {
        const routePoint = route[i];
        const coordinates = Array.isArray(routePoint.coordinates)
          ? routePoint.coordinates
          : [routePoint.longitude, routePoint.latitude];

        const distance = this.calculateHaversineDistance(
          [currentPosition[1], currentPosition[0]],
          [coordinates[1], coordinates[0]],
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestPointIndex = i;
        }
      }

      // Extract upcoming route points up to lookAheadDistance
      const relevantRoutePoints:any = [];
      let cumulativeDistance = 0;

      relevantRoutePoints.push(currentPosition);

      for (let i = closestPointIndex; i < route.length - 1; i++) {
        const point1 = route[i];
        const point2 = route[i + 1];

        const coords1 = Array.isArray(point1.coordinates)
          ? point1.coordinates
          : [point1.longitude, point1.latitude];

        const coords2 = Array.isArray(point2.coordinates)
          ? point2.coordinates
          : [point2.longitude, point2.latitude];

        relevantRoutePoints.push(coords1);

        const segmentDistance = this.calculateHaversineDistance(
          [coords1[1], coords1[0]],
          [coords2[1], coords2[0]],
        );

        cumulativeDistance += segmentDistance;

        if (cumulativeDistance >= lookAheadDistance) {
          relevantRoutePoints.push(coords2);
          break;
        }
      }

      // Create a buffer around the line formed by these points
      const bufferWidth = 50; // meters on each side
      return this.createBufferedPolygon(relevantRoutePoints, bufferWidth);
    } catch (error) {
      this.logger.error(`Error creating route search area: ${error.message}`);
      // Fall back to a simple radius search if route processing fails
      return {
        type: 'Circle',
        coordinates: [currentPosition[0], currentPosition[1]],
        radius: lookAheadDistance / 2,
      };
    }
  }

  /**
   * Create a buffered polygon around a line of points
   */
  private createBufferedPolygon(points: any[], bufferWidthMeters: number): any {
    if (points.length < 2) {
      return null;
    }

    const bufferPoints:any = [];

    // Calculate approximate degrees for buffer width (very rough approximation)
    const bufferDegrees = bufferWidthMeters / 111000; // ~111km per degree

    // Create right side of buffer
    for (let i = 0; i < points.length; i++) {
      const point = points[i];

      // Skip if not enough points to calculate perpendicular
      if (i === 0 || i === points.length - 1) {
        bufferPoints.push([point[0], point[1]]);
        continue;
      }

      // Get previous and next points
      const prev = points[i - 1];
      const next = points[i + 1];

      // Calculate perpendicular direction
      const dx1 = point[0] - prev[0];
      const dy1 = point[1] - prev[1];
      const dx2 = next[0] - point[0];
      const dy2 = next[1] - point[1];

      // Average direction
      const dx = (dx1 + dx2) / 2;
      const dy = (dy1 + dy2) / 2;

      // Normalize
      const length = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / length;
      const ny = dy / length;

      // Perpendicular
      const px = -ny;
      const py = nx;

      // Add buffer point
      bufferPoints.push([
        point[0] + px * bufferDegrees,
        point[1] + py * bufferDegrees,
      ]);
    }

    // Add left side of buffer in reverse
    for (let i = points.length - 1; i >= 0; i--) {
      const point = points[i];

      if (i === 0 || i === points.length - 1) {
        bufferPoints.push([point[0], point[1]]);
        continue;
      }

      // Get previous and next points
      const prev = points[i - 1];
      const next = points[i + 1];

      // Calculate perpendicular direction
      const dx1 = point[0] - prev[0];
      const dy1 = point[1] - prev[1];
      const dx2 = next[0] - point[0];
      const dy2 = next[1] - point[1];

      // Average direction
      const dx = (dx1 + dx2) / 2;
      const dy = (dy1 + dy2) / 2;

      // Normalize
      const length = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / length;
      const ny = dy / length;

      // Perpendicular (opposite direction)
      const px = ny;
      const py = -nx;

      // Add buffer point
      bufferPoints.push([
        point[0] + px * bufferDegrees,
        point[1] + py * bufferDegrees,
      ]);
    }

    // Close the polygon
    bufferPoints.push(bufferPoints[0]);

    return {
      type: 'Polygon',
      coordinates: [bufferPoints],
    };
  }

  /**
   * Save coordinates for a user
   * IMPORTANT: This is your original function name maintained for compatibility
   */
  async save_coordinates(
    user: any,
    payload: LatLong,
  ): Promise<DriverLocationResult> {
    try {
      this.logger.debug(`Saving coordinates for user: ${user._id}`);

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

      if (!updatedUser) {
        throw new Error(`User not found: ${user._id}`);
      }

      return {
        driver: updatedUser,
        driverBearing: movementMetrics.bearing,
        driverSpeed: movementMetrics.speed,
      };
    } catch (error) {
      this.logger.error(
        `Error in save_coordinates: ${error.message}`,
        error.stack,
      );
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
  ): Promise<MovementMetrics> {
    const defaultMetrics = { bearing: user.current_bearing || 0, speed: 0 };

    if (!user.pre_location?.coordinates) {
      return defaultMetrics;
    }

    const [prevLng, prevLat] = user.pre_location.coordinates;
    const distanceMoved = this.calculateHaversineDistance(
      [prevLat, prevLng],
      [newLat, newLng],
    );

    if (distanceMoved < this.MIN_MOVEMENT) {
      return defaultMetrics;
    }

    const timeDiff =
      (Date.now() - (user.last_location_update?.getTime() || Date.now())) /
      1000;
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

    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    return this.EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

    return bearing;
  }

  private calculatePointAtDistance(
    lat: number,
    long: number,
    distanceMeters: number,
    bearingDegrees: number,
  ): [number, number] {
    const δ = distanceMeters / this.EARTH_RADIUS; // Angular distance
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
}
