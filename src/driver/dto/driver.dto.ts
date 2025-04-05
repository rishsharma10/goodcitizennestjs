import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsString } from "class-validator";

export class RideDto {
    @ApiProperty({
        example: { latitude: "12.9716", longitude: "77.5946" }
    })
    @IsObject()
    pickup_location: { latitude: string; longitude: string };

    @ApiProperty({
        example: { latitude: "12.9716", longitude: "77.5946" }
    })
    @IsObject()
    drop_location: { latitude: string; longitude: string };

    @ApiProperty()
    @IsNotEmpty({ message: 'pickup address is required' })
    @IsString()
    pickup_address: string;

    @ApiProperty()
    @IsNotEmpty({ message: 'drop address is required' })
    @IsString()
    drop_address: string;
}


export class ID {
    @ApiProperty({ description: "Enter ride id here" })
    @IsNotEmpty({ message: 'id is required' })
    @IsString()
    id: string;
}
