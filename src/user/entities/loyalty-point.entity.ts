import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import * as moment from "moment";
import { User } from "./user.entity";
import { DriverRide } from "src/driver/entities/driver-ride.entity";

@Schema({ versionKey: false })
export class LoyaltyPoint {

    @Prop({ type: Types.ObjectId, ref: User.name })
    user_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: DriverRide.name })
    ride_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: User.name })
    driver_id: Types.ObjectId;

    @Prop({ default: 0 })
    loyalty_point: number;

    @Prop({ default: null })
    created_at: number;

    @Prop({ default: moment().utc().valueOf() })
    updated_at: number;
}

export type LoyaltyPointDocument = HydratedDocument<LoyaltyPoint>;
export const LoyaltyPointSchema = SchemaFactory.createForClass(LoyaltyPoint);