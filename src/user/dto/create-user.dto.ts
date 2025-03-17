import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsString, IsStrongPassword, Length, MinLength } from "class-validator";
import { Device_TYPE } from "../../common/utils";
import { Types } from "mongoose";

export class SignupDto {
    @ApiProperty({ default: "john@yopmail.com" })
    @IsEmail({}, { message: 'Email must be an valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;
  
    @ApiProperty()
    @Length(8, 20, { message: 'Password must be between 8 and 20 characters long' })
    @IsNotEmpty({ message: 'password is required' })
    @IsStrongPassword({
      minLength: 6,
      minLowercase: 1,
      minNumbers: 1,
      minSymbols: 1,
      minUppercase: 1
    })
    @IsString()
    password: string;

    @ApiProperty()
    @IsNotEmpty({ message: 'fcm token is required' })
    @IsString()
    fcm_token: string;
  
    @ApiProperty({ default: Device_TYPE.WEB })
    @IsNotEmpty({ message: 'device type is required' })
    @IsEnum(Device_TYPE)
    @IsString()
    device_type: string;
}

export class OtpDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'otp is required' })
  @MinLength(6, { message: "otp must be atleast 6 characters" })
  @IsString()
  otp: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'fcm token is required' })
  @IsString()
  fcm_token: string;

  @ApiProperty({ default: Device_TYPE.WEB })
  @IsNotEmpty({ message: 'device type is required' })
  @IsEnum(Device_TYPE)
  @IsString()
  device_type: string;
}

export class ResponseUserDto {
  @IsString()
  _id: string | Types.ObjectId;;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsString()
  full_name: string;

  @IsString()
  company_name: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  access_token: string;

  @IsString()
  role: string;

  @IsString()
  refresh_token: string;

  @IsBoolean()
  is_email_verified:boolean;

  constructor(partial: Partial<ResponseUserDto>) {
    Object.assign(this, partial);
  }
}
