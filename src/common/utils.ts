export enum UserType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER',
}

export enum Device_TYPE {
  WEB = "WEB",
  IOS = "IOS",
  ANDROID = "ANDROID",
}

export enum RideStatus {
  PENDING = "PENDING",
  STARTED = "STARTED",
  COMPLETED = "COMPLETED",
}

export enum DIRECTION {
  NORTH = "NORTH",
  NORTH_EAST = "NORTH_EAST",
  EAST = "EAST",
  SOUTH_EAST = "SOUTH_EAST",
  SOUTH = "SOUTH",
  SOUTH_WEST = "SOUTH_WEST",
  WEST = "WEST",
  NORTH_WEST = "NORTH_WEST"
}

export interface Query {
  [key: string]: string | boolean;
}