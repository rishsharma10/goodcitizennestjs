import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { User } from "../../user/entities/user.entity";
import { RideStatus } from "src/common/utils";

@Schema({versionKey: false })
export class DriverRide {

    @Prop({ type: Types.ObjectId, ref: User.name })
    driver_id: Types.ObjectId;

    @Prop({ 
        type: { 
            latitude: { type: Number, required: true }, 
            longitude: { type: Number, required: true } 
        } 
    })
    pickup_location: { latitude: number; longitude: number };

    @Prop({ 
        type: { 
            latitude: { type: Number, required: true }, 
            longitude: { type: Number, required: true } 
        } 
    })
    destination_location: { latitude: number; longitude: number };

    @Prop({enum: RideStatus, default: RideStatus.PENDING })
    status: string;
    
    @Prop({ default: null })
    created_at: number;
}

export type DriverRideDocument = HydratedDocument<DriverRide>;
export const DriverRideSchema = SchemaFactory.createForClass(DriverRide);