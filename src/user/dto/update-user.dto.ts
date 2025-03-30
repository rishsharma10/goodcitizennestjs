import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsStrongPassword, Length } from 'class-validator';

export class UpdateUserDto {
    @ApiProperty({ default: "john@yopmail.com" })
    @IsEmail({}, { message: 'Email must be an valid email address' })
    @IsOptional()
    email: string;

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
