import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

export class LocationDto {
    @ApiProperty()
    latitude: number;
  
    @ApiProperty()
    longitude: number;
}

export class RideDto {
    @ApiProperty({ type: LocationDto })
    @ValidateNested()
    @Type(() => LocationDto)
    pickup_location: LocationDto;
   
    @ApiProperty({ type: LocationDto })
    @ValidateNested()
    @Type(() => LocationDto)
    destination_location: LocationDto;
}
