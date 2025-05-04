import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString, ValidateNested } from "class-validator";

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

export class BearingRequestDto {
  @ValidateNested()
  @Type(() => LatLong)
  from: LatLong;

  @ValidateNested()
  @Type(() => LatLong)
  to: LatLong;

  @ValidateNested()
  @Type(() => LatLong)
  user: LatLong;
}