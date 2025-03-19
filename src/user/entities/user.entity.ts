import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import  moment from "moment";
import { UserType } from "../../common/utils";

@Schema({ versionKey: false })
export class User {

    // @Prop({ required: true, type: String })
    // first_name: string;

    // @Prop({ required: true, type: String })
    // last_name: string;

    @Prop({ required: true, type: String })
    email: string;

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
    is_email_verified: boolean;
    
    @Prop({ 
        type: { 
            latitude: { type: Number, required: true }, 
            longitude: { type: Number, required: true } 
        } 
    })
    location: { latitude: number; longitude: number };

    @Prop({ type: Number })
    latitude: number;

    @Prop({ type: Number })
    longitude: number;

    @Prop({ default: () => moment().utc().valueOf() })
    created_at: number;

    @Prop({ default: () => moment().utc().valueOf() })
    updated_at: number;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);