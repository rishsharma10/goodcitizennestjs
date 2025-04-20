import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class LatLong {
  @ApiProperty()
  @IsNotEmpty({ message: 'latitude is required' })
  @IsString()
  lat: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'longitude is required' })
  @IsString()
  long: string;
}

export class DriverLatLong {
  @ApiProperty()
  @IsNotEmpty({ message: 'latitude is required' })
  @IsString()
  lat: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'longitude is required' })
  @IsString()
  long: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'ride id is required' })
  @IsString()
  ride_id: string;
}
