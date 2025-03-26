import { ApiProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";

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
}

