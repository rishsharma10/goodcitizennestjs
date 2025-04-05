import { ModelDefinition } from "@nestjs/mongoose";
import { DriverRide, DriverRideSchema } from "./driver-ride.entity";

export const rideModelDefinitions: ModelDefinition[] = [
    {
      name: DriverRide.name,
      schema: DriverRideSchema, 
    },
   
  ];
  