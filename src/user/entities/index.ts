import { ModelDefinition } from "@nestjs/mongoose";
import { User, UserSchema } from "./user.entity";
import { Session, SessionSchema } from "./session.entity";

export const modelDefinitions: ModelDefinition[] = [
    {
      name: User.name,
      schema: UserSchema, 
    },
    {
        name: Session.name,
        schema: SessionSchema, 
    },
  ];
  