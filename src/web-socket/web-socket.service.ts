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
    ) {

    }
    async handleConnection(token: string, socket_id) {
        try {
            const decoded = await this.commonService.decodeToken(token);
            const session = await this.sessionModel.findById({ _id: new Types.ObjectId(decoded.session_id) }, {}, this.updateOption);
            if (!session) throw new UnauthorizedException();
            let user_id = session.user_id;
            let update = { is_online: true, socket_id }
            let user = await this.userModel.findByIdAndUpdate({ _id: new Types.ObjectId(user_id) }, update, this.option)
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
            let { lat, long } = payload
            let query = { _id: new Types.ObjectId(user._id) }
            let location = {
                type: "Point",
                coordinates: [parseFloat(long), parseFloat(lat)] // Note: MongoDB stores coordinates as [longitude, latitude]
            };

            // let direction = await this.calculatDirection(user.latitude, user.longitude, +lat, +long);
            let driverBearing = await this.calculateBearing(user.latitude, user.longitude, +lat, +long);
            let update = {
                $set: {
                    pre_location: user?.location ||
                    {
                        type: "Point",
                        coordinates: [parseFloat(user.longitude), parseFloat(user.latitude)]
                    },
                    location,
                    latitude: parseFloat(lat),
                    longitude: parseFloat(long),
                    // direction
                }
            }
            console.log(update, "update");
            let getUser = await this.userModel.findByIdAndUpdate(query, update, { new: true });
            return { driver: getUser, driverBearing }
        } catch (error) {
            console.log('erorooooo', error);

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

            const usersAheadTokens = await Promise.all(
                users.map(async user => {
                    console.log("user----", user);

                    if (!user.pre_location || !Array.isArray(user.pre_location.coordinates)) return null;

                    const [prevLong, prevLat] = user.pre_location.coordinates;
                    const userBearing = this.calculateBearing(prevLat, prevLong, user.latitude, user.longitude);
                    const token = await this.sessionModel.findOne({ user_id: user._id }).lean();

                    // Users are ahead if they are within a 60° cone in front of the driver
                    const directionDifference = this.getAngleDifference(userBearing, bearing);
                    console.log(`driverBearing`, bearing);
                    console.log(`userBearing ${user._id}`, userBearing);
                    console.log(`directionDifference`, directionDifference);

                    if (is_first) {
                        return token;
                    }
                    return directionDifference <= 180 ? token : null;
                })
            );
            console.log("usersAheadTokens", usersAheadTokens);

            // Filter out null values
            const validTokens = usersAheadTokens
                .filter(token => token?.fcm_token !== null)
                .map(token => ({
                    fcm_token: token?.fcm_token,
                    user_id: token?.user_id
                }));

            console.log("validTokens", validTokens);

            let message = "Ambulane is nearby";
            let title = "Notification";
            await this.notificationService.send_notification(validTokens, message, title, driver_id, ride_id)
        } catch (error) {
            throw error
        }
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
