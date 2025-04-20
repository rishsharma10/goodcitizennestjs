import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsStrongPassword, Length } from 'class-validator';
import { RideStatus } from 'src/common/utils';

export class UpdateUserDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    first_name: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    last_name: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    country_code: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    phone_number: string;

    @ApiProperty()
    @Length(8, 20, { message: 'Password must be between 8 and 20 characters long' })
    @IsOptional()
    @IsString()
    old_password: string;

    @ApiProperty()
    @Length(8, 20, { message: 'Password must be between 8 and 20 characters long' })
    @IsOptional()
    @IsStrongPassword({
        minLength: 6,
        minLowercase: 1,
        minNumbers: 1,
        minSymbols: 1,
        minUppercase: 1
    })
    @IsString()
    new_password: string;
}

export class notification {
    @ApiProperty()
    @IsString()
    @IsEnum(RideStatus)
    status: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    pagination: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    limit: string;
}
