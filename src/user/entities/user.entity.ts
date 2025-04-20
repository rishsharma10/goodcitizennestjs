import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import * as moment from "moment";
import { DIRECTION, UserType } from "../../common/utils";

class Point {
    @Prop({ type: String, enum: ['Point'], default: 'Point' })
    type: string;

    @Prop({ type: [Number], required: true, default: [0, 0] }) // Ensure coordinates are always an array
    coordinates: number[];
}

@Schema({ versionKey: false })
export class User {

    @Prop({ type: String })
    first_name: string;

    @Prop({ type: String })
    last_name: string;

    @Prop({ type: String })
    email: string;

    @Prop({ type: String })
    country_code: string;

    @Prop({ type: String })
    phone_number: string;

    @Prop({ required: true, type: String })
    password: string;

    @Prop({ required: true, type: String, enum: UserType, default: UserType.USER })
    role: string;

    @Prop({ type: String })
    otp: string;

    @Prop({ type: String })
    otp_expire_at: Date;

    @Prop({ type: Boolean, default: false })
    is_deleted: boolean;

    @Prop({ type: Boolean, default: false })
    is_online: boolean;

    @Prop({ type: Boolean, default: false })
    is_email_verified: boolean;

    @Prop({ type: Point, required: true, default: { type: 'Point', coordinates: [0, 0] } })
    location: Point;

    @Prop({ type: Point, required: true, default: { type: 'Point', coordinates: [0, 0] } })
    pre_location: Point;

    @Prop({ type: Number })
    latitude: number;

    @Prop({ type: Number })
    longitude: number;

    @Prop({ type: String, enum: DIRECTION })
    direction: string;

    @Prop({ type: String })
    socket_id: string;

    @Prop({ type: Number })
    loyalty_point: number;

    @Prop({ default: moment().utc().valueOf() })
    created_at: number;

    @Prop({ default: moment().utc().valueOf() })
    updated_at: number;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ location: "2dsphere" });