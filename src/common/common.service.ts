import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcrypt';
import { Types } from "mongoose";

@Injectable()
export class CommonService {
    private JWT_ACCESS_SECRET: string
    private JWT_ACCESS_EXPIRY: string
  
    private TEMP_JWT_ACCESS_SECRET: string
    private TEMP_JWT_ACCESS_EXPIRY: string

    private JWT_REFRESH_SECRET: string
    private JWT_REFRESH_EXPIRY: string

    constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    ){
      this.TEMP_JWT_ACCESS_SECRET = this.configService.get<string>('TEMP_JWT_ACCESS_SECRET')!,
      this.TEMP_JWT_ACCESS_EXPIRY = this.configService.get<string>('TEMP_JWT_ACCESS_EXPIRY')!,

      this.JWT_ACCESS_SECRET = this.configService.get<string>('JWT_ACCESS_SECRET')!,
      this.JWT_ACCESS_EXPIRY = this.configService.get<string>('JWT_ACCESS_EXPIRY')!,

      this.JWT_REFRESH_SECRET = this.configService.get<string>('JWT_REFRESH_SECRET')!,
      this.JWT_REFRESH_EXPIRY = this.configService.get<string>('JWT_REFRESH_EXPIRY')!  
    }
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }
    
    async compareHash(password: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(password, hashedPassword);
    }
    
    async generateToken(
    _id: Types.ObjectId | string,
    session_id: Types.ObjectId | string,
    email: string, role: string) {
    return this.jwtService.sign(
        { _id, email, role, session_id },
        {
        secret: this.JWT_ACCESS_SECRET,
        expiresIn: this.JWT_ACCESS_EXPIRY
        }
        );
    }

    async generateTempToken(_id: Types.ObjectId | string, email: string, role: string ) {
        return this.jwtService.sign(
          { _id, email, role },
          {
            secret: this.TEMP_JWT_ACCESS_SECRET,
            expiresIn: this.TEMP_JWT_ACCESS_EXPIRY
          }
        );
      }
}