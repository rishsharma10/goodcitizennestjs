import { Injectable } from "@nestjs/common";
import { FirebaseAdmin, InjectFirebaseAdmin } from "nestjs-firebase";


@Injectable()
export class NotificationService {
    constructor(@InjectFirebaseAdmin() private firebase: FirebaseAdmin) { }

    async send_notification(tokens: (string | undefined)[], message: string, title: string = 'Notification') {
        try {
            // Remove duplicates and ensure we have an array
            const uniqueTokens = [...new Set(tokens)];
            // Firebase has a limit of 500 tokens per multicast
            const chunkSize = 500;
            // Prepare notification payload
            const payload = {
                title: title,
                body: message
            };

            // Split tokens into chunks of 500
            for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
                const tokenChunk = uniqueTokens.slice(i, i + chunkSize);

                const messagePayload = {
                    notification: payload,
                    webpush: {
                        notification: {
                            requireInteraction: false,
                            renotify: false,
                        },
                    },
                    tokens: tokenChunk,
                } as any;

                // Send notification to current chunk
                this.firebase.messaging.sendEachForMulticast(messagePayload);
            }

            // Wait for all notification batches to complete
            return
        } catch (error) {
            console.error('Error sending notifications:', error);
            throw error;
        }
    }
}