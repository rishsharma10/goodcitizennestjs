import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import * as moment from "moment";
import { User, UserSchema } from "./user.entity";
import { Device_TYPE, UserType } from "../../common/utils";

@Schema({versionKey: false })
export class Session {

    @Prop({ type: Types.ObjectId, ref: User.name })
    user_id: Types.ObjectId;

    @Prop({ required: true, type: String, enum: UserType, default: UserType.USER })
    role: string;

    @Prop({ default: null })
    fcm_token: string;

    @Prop({ default: null })
    refresh_token: string;

    @Prop({ default: Device_TYPE.WEB, enum: Device_TYPE.WEB })
    device_type: string;

    @Prop({ default: null })
    created_at: number;

    @Prop({ default: moment().utc().valueOf() })
    updated_at: number;
}

export type SessionDocument = HydratedDocument<Session>;
export const SessionSchema = SchemaFactory.createForClass(Session);