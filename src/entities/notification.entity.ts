import { Prop, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { User } from "src/user/entities/user.entity";


export class Notification {

    @Prop({ type: Types.ObjectId, ref: User.name })
    user_id: string
    
    @Prop({ type: Types.ObjectId, ref: User.name })
    driver_id: string

    @Prop({ default: null })
    created_at: number;
}

export type NotificationDocument = HydratedDocument<Notification>
export const NotificationSchema = SchemaFactory.createForClass(Notification)