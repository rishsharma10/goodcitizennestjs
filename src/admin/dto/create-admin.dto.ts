import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class AdminLoginDto {
    @ApiProperty({ default: "admin@gmail.com" })
    @IsEmail({}, { message: 'Email must be an valid email address' })
    @IsString()
    email: string;

    @ApiProperty({ default: "Asdfghjkl@1" })
    @IsNotEmpty({ message: 'password is required' })
    @IsString()
    password: string;
}

export class Listing {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    pagination: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    limit: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    search: string;
}

export class ListingDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    pagination: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    limit: string;
}

export class Idto {
    @ApiProperty({})
    @IsNotEmpty({ message: 'id is required' })
    @IsString()
    id: string
}
