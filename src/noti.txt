import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';
import {
  Notification,
  NotificationDocument,
} from 'src/entities/notification.entity';
import {
  LoyaltyPoint,
  LoyaltyPointDocument,
} from 'src/user/entities/loyalty-point.entity';
import { User, UserDocument } from 'src/user/entities/user.entity';
import { RideStatus } from './utils';

@Injectable()
export class NotificationService {
  private option = { lean: true, sort: { _id: -1 } } as const;

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(LoyaltyPoint.name)
    private loyaltyPointModel: Model<LoyaltyPointDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectFirebaseAdmin() private firebase: FirebaseAdmin,
  ) {}

  async send_notification(
    tokens: any,
    message: string,
    title: string,
    driver_id: string | Types.ObjectId,
    ride_id: string | Types.ObjectId,
  ) {
    try {
      console.log('tokens---', tokens);

      const chunkSize = 500;
        const payload = {
          title,
          body: message,
        };
   
        for (let i = 0; i < tokens.length; i += chunkSize) {
          const tokenChunk = tokens.slice(i, i + chunkSize);

          const fcmTokens = tokenChunk.map((t) => t.fcm_token);


          const messagePayload = {
            notification: payload,
            webpush: {
              notification: {
                requireInteraction: false,
                renotify: false,
              },
            },
            tokens: fcmTokens,
          };

          const response = await this.firebase.messaging.sendEachForMulticast(messagePayload);
          console.log("resp",response);
          
          response.responses.forEach((res, index) => {
            if (res.success) {
              const { user_id } = tokenChunk[index];

              let save_notify = {
                user_id: new Types.ObjectId(user_id),
                driver_id: new Types.ObjectId(driver_id),
                message,
                status: RideStatus.STARTED,

                created_at: new Date(),
              };

              this.notificationModel.create(save_notify);
              console.log('save_notify', save_notify);

              this.loyalty_point(user_id, driver_id, ride_id);
            }
          });
        }

      return;
    } catch (error) {
      console.error('Error sending notifications:', error);
      throw error;
    }
  }

  async loyalty_point(
    user_id: string,
    driver_id: string | Types.ObjectId,
    ride_id: string | Types.ObjectId,
  ) {
    try {
      let query = {
        user_id: new Types.ObjectId(user_id),
        driver_id: new Types.ObjectId(driver_id),
        ride_id: new Types.ObjectId(ride_id),
      };
      let point = await this.loyaltyPointModel.findOne(query, {}, this.option);
      if (!point) {
        let data = {
          user_id: new Types.ObjectId(user_id),
          driver_id: new Types.ObjectId(driver_id),
          ride_id: new Types.ObjectId(ride_id),
          loyalty_point: 5,
        };
        await this.loyaltyPointModel.create(data);
        await this.userModel.findByIdAndUpdate(
          { _id: new Types.ObjectId(user_id) },
          { $inc: { loyalty_point: 5 } },
        );
      }
    } catch (error) {
      throw error;
    }
  }
}
