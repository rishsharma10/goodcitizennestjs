import { ModelDefinition } from "@nestjs/mongoose";
import { Notification, NotificationSchema } from "./notification.entity";

export const commonModelDefinitions: ModelDefinition[] = [
    {
        name: Notification.name,
        schema: NotificationSchema,
    },

];
