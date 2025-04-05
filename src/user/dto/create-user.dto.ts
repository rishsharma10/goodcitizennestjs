import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsString, IsStrongPassword, Length, MinLength } from "class-validator";
import { Device_TYPE, UserType } from "../../common/utils";
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

  @ApiProperty({ default: UserType.USER })
  @IsNotEmpty({ message: 'user type is required' })
  @IsEnum(UserType)
  @IsString()
  role: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'latitude is required' })
  @IsString()
  lat: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'longitude is required' })
  @IsString()
  long: string;

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
  is_email_verified: boolean;

  @IsString()
  ride_id: string | Types.ObjectId;

  constructor(partial: Partial<ResponseUserDto>) {
    Object.assign(this, partial);
  }
}

export class LoginDto {
  @ApiProperty({ default: "john@yopmail.com" })
  @IsEmail({}, { message: 'Email must be an valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'password is required' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'latitude is required' })
  @IsString()
  lat: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'longitude is required' })
  @IsString()
  long: string;

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

export class ForgotPassword {
  @ApiProperty()
  @IsNotEmpty({ message: 'email is required' })
  @IsEmail()
  email: string;
}

export class VerifyForgotPassword {
  @ApiProperty()
  @IsNotEmpty({ message: 'email is required' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6, { message: "otp must be atleast 6 characters" })
  @IsNotEmpty({ message: 'otp is required' })
  otp: string;
}


export class ResetForgotPassword {
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
}


export class ResendOtp {
  @ApiProperty()
  @IsNotEmpty({ message: 'email is required' })
  @IsEmail()
  email: string;
}