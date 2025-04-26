import { Prop, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { RideStatus } from "src/common/utils";
import { User } from "src/user/entities/user.entity";


export class Notification {

    @Prop({ type: Types.ObjectId, ref: User.name })
    user_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: User.name })
    driver_id: Types.ObjectId;

    @Prop({ default: null })
    message: string;

    @Prop({ default: RideStatus.STARTED })
    status: string;

    @Prop({ default: null })
    created_at: Date;
}

export type NotificationDocument = HydratedDocument<Notification>
export const NotificationSchema = SchemaFactory.createForClass(Notification)