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
    ) {

    }
    async handleConnection(token: string, socket_id) {
        try {
            const decoded = await this.commonService.decodeToken(token);
            const session = await this.sessionModel.findById({ _id: decoded.session_id }, {}, this.updateOption);
            if (!session) throw new UnauthorizedException();
            let user_id = session.user_id;
            let update = { is_online: true, socket_id }
            let user = await this.userModel.findByIdAndUpdate({ _id: user_id }, update, this.option)
            if (!user) throw new UnauthorizedException();
            return user;
        } catch (error) {
            throw error;
        }
    }

    async handleDisconnect(user_id: string) {
        try {
            let update = { is_online: false }
            await this.userModel.updateOne({ _id: new Types.ObjectId(user_id) }, update)
            return
        } catch (error) {
            throw error;
        }
    }

    async save_coordinates(user: any, payload: LatLong): Promise<any> {
        try {
            let { lat, long } = payload;
            let query = { _id: new Types.ObjectId(user._id) }
            let location = {
                type: "Point",
                coordinates: [+long, +lat] // Note: MongoDB stores coordinates as [longitude, latitude]
            };
            // let direction = await this.calculatDirection(user.latitude, user.longitude, +lat, +long);
            let update = {
                $set: {
                    pre_location: user?.location,
                    location,
                    latitude: +lat,
                    longitude: +long,
                    // direction
                }
            }
            return await this.userModel.findByIdAndUpdate(query, update, { new: true });
        } catch (error) {
            throw error
        }
    }

    async calculatDirection(prevLat: number, prevLon: number, curLat: number, curLon: number): Promise<string> {
        const toRadians = (deg: number) => deg * (Math.PI / 180);
        const toDegrees = (rad: number) => rad * (180 / Math.PI);

        const lat1 = toRadians(prevLat);
        const lat2 = toRadians(curLat);
        const diffLong = toRadians(curLon - prevLon);

        const x = Math.sin(diffLong) * Math.cos(lat2);
        const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(diffLong);

        let initialBearing = toDegrees(Math.atan2(x, y));
        let degree = (initialBearing + 360) % 360; // Normalize to 0-360 degrees
        // **Using angle ranges**
        if (degree >= 337.5 || degree < 22.5) return DIRECTION.NORTH;
        if (degree >= 22.5 && degree < 67.5) return DIRECTION.NORTH_EAST;
        if (degree >= 67.5 && degree < 112.5) return DIRECTION.EAST;
        if (degree >= 112.5 && degree < 157.5) return DIRECTION.SOUTH_EAST;
        if (degree >= 157.5 && degree < 202.5) return DIRECTION.SOUTH;
        if (degree >= 202.5 && degree < 247.5) return DIRECTION.SOUTH_WEST;
        if (degree >= 247.5 && degree < 292.5) return DIRECTION.WEST;
        if (degree >= 292.5 && degree < 337.5) return DIRECTION.NORTH_WEST;

        return DIRECTION.NORTH; // Default (Failsafe)

    }

    //  comented================
    //   async findUsersAhead(driver_id: string,lat: number, long: number, direction:string,radiusInKm): Promise<User[]> {
    //       const radiusInRadians = radiusInKm / 6378.1; // Earth radius in km
    //       let query = {
    //         _id: {$ne: new Types.ObjectId(driver_id)},
    //           direction,
    //           location: {
    //               $geoWithin: {
    //                   $centerSphere: [[long, lat], radiusInRadians] // [longitude, latitude]
    //               }
    //           }
    //       }
    //       let projection = {_id: 1, socket_id: 1,latitude: 1, longitude: 1}
    //       let users = await this.userModel.find(query, projection, this.option);
    //       console.log("lat",lat);
    //       console.log("long",long);
    //       console.log("users",users);

    //       return users.filter(user => {
    //       const {latitude, longitude} = user
    //         // Calculate relative position based on direction
    //         switch (direction) {
    //           case DIRECTION.NORTH:
    //               return latitude > lat && Math.abs(longitude - long) < 0.002; // Allow small lateral deviation
    //           case DIRECTION.SOUTH:
    //               return latitude < lat && Math.abs(longitude - long) < 0.002;
    //           case DIRECTION.EAST:
    //               return longitude > long && Math.abs(latitude - lat) < 0.002;
    //           case DIRECTION.WEST:
    //               return longitude < long && Math.abs(latitude - lat) < 0.002;
    //           case DIRECTION.NORTH_EAST:
    //               return latitude > lat && longitude > long;
    //           case DIRECTION.NORTH_WEST:
    //               return latitude > lat && longitude < long;
    //           case DIRECTION.SOUTH_EAST:
    //               return latitude < lat && longitude > long;
    //           case DIRECTION.SOUTH_WEST:
    //               return latitude < lat && longitude < long;
    //           default:
    //               return false;
    //         }
    //       })
    //   }


    // async findUsersAhead(
    //     driver_id: string,
    //     lat: number,
    //     long: number,
    //     direction: string, // Driver's direction (NORTH, EAST, etc.)
    //     radiusInKm: number
    // ): Promise<User[]> {
    //     const radiusInRadians = radiusInKm / 6378.1; // Convert km to radians

    //     // Initial geo query to get nearby users without directional filtering
    //     let query = {
    //         role: "USER", // Only get users, not other drivers
    //         location: {
    //             $geoWithin: {
    //                 $centerSphere: [[long, lat], radiusInRadians] // [longitude, latitude]
    //             }
    //         }
    //     };

    //     let projection = {
    //         _id: 1,
    //         socket_id: 1,
    //         latitude: 1,
    //         longitude: 1,
    //         direction: 1,
    //         location: 1,
    //         pre_location: 1
    //     };
    //     // Get all nearby users
    //     const users = await this.userModel.find(query, projection, this.option);
    //     console.log(`Found ${users.length} users within ${radiusInKm}km radius`);

    //     // Apply more sophisticated filtering based on position and direction
    //     return this.filterUsersInSameLaneAhead(users, lat, long, direction);
    // }

    // filterUsersInSameLaneAhead(
    //     users: User[],
    //     driverLat: number,
    //     driverLong: number,
    //     driverDirection: string
    // ): User[] {
    //     // Convert driver direction to bearing angle
    //     const driverBearing = this.directionToAngle(driverDirection);

    //     // Define broader acceptable deviation for initial filtering
    //     // More restrictive checks will be applied in subsequent steps
    //     const initialDeviation = 60; // Start with a wider angle to catch potential matches

    //     console.log(`Driver at [${driverLat}, ${driverLong}] heading ${driverDirection} (${driverBearing}°)`);
    //     console.log(`Processing ${users.length} nearby users...`);

    //     // First, filter for users ahead of the driver
    //     const usersAhead = users.filter(user => {
    //         // Check if user is ahead of driver based on direction
    //         const isAhead = this.isUserAheadOfDriver(user, driverLat, driverLong, driverDirection);

    //         // Log results to help with debugging
    //         console.log(`User ${user}: position [${user.latitude}, ${user.longitude}], ahead: ${isAhead}`);

    //         return isAhead;
    //     });

    //     console.log(`${usersAhead.length} users are ahead of driver`);

    //     // Now filter for users in approximately the same lane
    //     const usersInSameLane = usersAhead.filter(user => {
    //         // Skip users without direction data
    //         if (!user.direction) {
    //             console.log(`User ${user}: No direction data available`);
    //             return false;
    //         }

    //         // Get user's direction as angle
    //         const userDirectionAngle = this.directionToAngle(user.direction);

    //         // Calculate angular difference between user and driver directions
    //         const directionDifference = this.getAngleDifference(userDirectionAngle, driverBearing);

    //         // Check if user is moving in roughly the same direction as driver
    //         const inSameLane = directionDifference <= initialDeviation;

    //         console.log(`User ${user}: direction ${user.direction} (${userDirectionAngle}°), difference: ${directionDifference}°, in same lane: ${inSameLane}`);

    //         return inSameLane;
    //     });

    //     console.log(`${usersInSameLane.length} users are in the same lane as driver`);

    //     // Finally, if we have actual movement data, refine by observed movement patterns
    //     const usersWithAccuratePath = usersInSameLane.filter(user => {
    //         // Skip additional filtering if no movement history available
    //         if (!user.pre_location || !Array.isArray(user.pre_location.coordinates)) {
    //             console.log(`User ${user}: No movement history available, keeping based on current position/direction`);
    //             return true; // Keep users without movement history if they passed position & direction checks
    //         }

    //         const [prevLong, prevLat] = user.pre_location.coordinates;

    //         // Skip additional filtering if previous location is identical to current
    //         if (prevLat === user.latitude && prevLong === user.longitude) {
    //             console.log(`User ${user}: No movement detected, keeping based on current position/direction`);
    //             return true; // Keep stationary users if they passed position & direction checks
    //         }

    //         // Calculate actual movement bearing
    //         const actualBearing = this.calculateBearing(prevLat, prevLong, user.latitude, user.longitude);

    //         // Use a tighter deviation check for users with movement data
    //         const movementDeviation = 45;
    //         const bearingDifference = this.getAngleDifference(actualBearing, driverBearing);
    //         const movementAligned = bearingDifference <= movementDeviation;

    //         console.log(`User ${user}: actual movement bearing: ${actualBearing}°, difference: ${bearingDifference}°, aligned: ${movementAligned}`);

    //         return movementAligned;
    //     });

    //     console.log(`Final result: ${usersWithAccuratePath.length} users match all criteria`);
    //     return usersWithAccuratePath;
    // }

    // // Helper method to determine if a user is ahead of driver based on direction
    // isUserAheadOfDriver(user: User, driverLat: number, driverLong: number, driverDirection: string): boolean {
    //     // Enhanced logic to determine if a user is ahead based on direction
    //     // Includes direction-specific buffer zones to account for parallel roads

    //     const latDiff = user.latitude - driverLat;
    //     const longDiff = user.longitude - driverLong;

    //     // Expanded angle range for what constitutes "ahead"
    //     switch (driverDirection) {
    //         case DIRECTION.NORTH:
    //             return latDiff > 0;
    //         case DIRECTION.SOUTH:
    //             return latDiff < 0;
    //         case DIRECTION.EAST:
    //             return longDiff > 0;
    //         case DIRECTION.WEST:
    //             return longDiff < 0;
    //         case DIRECTION.NORTH_EAST:
    //             // More lenient check - either significantly north or significantly east
    //             return (latDiff > 0 && longDiff >= -0.0005) || (longDiff > 0 && latDiff >= -0.0005);
    //         case DIRECTION.NORTH_WEST:
    //             return (latDiff > 0 && longDiff <= 0.0005) || (longDiff < 0 && latDiff >= -0.0005);
    //         case DIRECTION.SOUTH_EAST:
    //             return (latDiff < 0 && longDiff >= -0.0005) || (longDiff > 0 && latDiff <= 0.0005);
    //         case DIRECTION.SOUTH_WEST:
    //             return (latDiff < 0 && longDiff <= 0.0005) || (longDiff < 0 && latDiff <= 0.0005);
    //         default:
    //             return false;
    //     }
    // }

    // // Calculate angle difference accounting for circular nature of angles
    // getAngleDifference(angle1: number, angle2: number): number {
    //     const diff = Math.abs(angle1 - angle2) % 360;
    //     return diff > 180 ? 360 - diff : diff;
    // }

    // // Convert direction string to bearing angle
    // directionToAngle(direction: string): number {
    //     const directionMap = {
    //         [DIRECTION.NORTH]: 0,
    //         [DIRECTION.NORTH_EAST]: 45,
    //         [DIRECTION.EAST]: 90,
    //         [DIRECTION.SOUTH_EAST]: 135,
    //         [DIRECTION.SOUTH]: 180,
    //         [DIRECTION.SOUTH_WEST]: 225,
    //         [DIRECTION.WEST]: 270,
    //         [DIRECTION.NORTH_WEST]: 315
    //     };
    //     return directionMap[direction] ?? -1; // -1 to catch invalid directions
    // }

    // Calculate bearing between two points
    // calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    //     const toRadians = (deg: number) => (deg * Math.PI) / 180;
    //     const toDegrees = (rad: number) => (rad * 180) / Math.PI;

    //     const φ1 = toRadians(lat1);
    //     const φ2 = toRadians(lat2);
    //     const Δλ = toRadians(lon2 - lon1);

    //     const x = Math.sin(Δλ) * Math.cos(φ2);
    //     const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    //     let θ = Math.atan2(x, y);
    //     θ = toDegrees(θ);

    //     return (θ + 360) % 360; // Normalize to 0-360 degrees
    // }
    //===============================

    async findUsersAhead(
        driver_id: string,
        lat: number,
        long: number,
        bearing: number, // Driver's movement angle
        radiusInKm: number
    ): Promise<User[]> {
        const radiusInRadians = radiusInKm / 6378.1; // Convert km to radians
    
        // Query: Get users within the radius, excluding the driver
        let query = {
            _id: { $ne: new Types.ObjectId(driver_id) },
            role: "USER",
            location: {
                $geoWithin: {
                    $centerSphere: [[long, lat], radiusInRadians]
                }
            }
        };
    
        const projection = {
            _id: 1,
            socket_id: 1,
            latitude: 1,
            longitude: 1,
            pre_location: 1
        };
    
        // Fetch users in range
        const users = await this.userModel.find(query, projection, this.option);
        console.log(`Found ${users.length} users within ${radiusInKm} km radius`);
    
        return users.filter(user => {
            if (!user.pre_location || !Array.isArray(user.pre_location.coordinates)) return false;
    
            const [prevLong, prevLat] = user.pre_location.coordinates;
            const userBearing = this.calculateBearing(prevLat, prevLong, user.latitude, user.longitude);
    
            // Users are ahead if they are within a 60° cone in front of the driver
            const directionDifference = this.getAngleDifference(userBearing, bearing);
            return directionDifference <= 60;
        });
    }
    
    // Calculate the bearing between two latitude/longitude points
    calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const toRadians = (deg: number) => (deg * Math.PI) / 180;
        const toDegrees = (rad: number) => (rad * 180) / Math.PI;
    
        const φ1 = toRadians(lat1);
        const φ2 = toRadians(lat2);
        const Δλ = toRadians(lon2 - lon1);
    
        const x = Math.sin(Δλ) * Math.cos(φ2);
        const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    
        let θ = Math.atan2(x, y);
        return (toDegrees(θ) + 360) % 360; // Normalize to 0-360 degrees
    }
    
    // Get the smallest angle difference (accounting for 360-degree wraparound)
    getAngleDifference(angle1: number, angle2: number): number {
        const diff = Math.abs(angle1 - angle2) % 360;
        return diff > 180 ? 360 - diff : diff;
    }
    
}
