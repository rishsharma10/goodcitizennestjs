import { ModelDefinition } from "@nestjs/mongoose";
import { User, UserSchema } from "./user.entity";
import { Session, SessionSchema } from "./session.entity";
import { LoyaltyPoint, LoyaltyPointSchema } from "./loyalty-point.entity";

export const modelDefinitions: ModelDefinition[] = [
    {
      name: User.name,
      schema: UserSchema, 
    },
    {
        name: Session.name,
        schema: SessionSchema, 
    },
    {
      name: LoyaltyPoint.name,
      schema: LoyaltyPointSchema, 
  },
  ];
  