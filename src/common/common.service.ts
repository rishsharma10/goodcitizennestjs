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
  ) {
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
    return await this.jwtService.signAsync(
      { _id, email, role, session_id },
      {
        secret: this.JWT_ACCESS_SECRET,
        expiresIn: this.JWT_ACCESS_EXPIRY
      }
    );
  }

  async generateTempToken(_id: Types.ObjectId | string, email: string, role: string) {
    return this.jwtService.sign(
      { _id, email, role },
      {
        secret: this.TEMP_JWT_ACCESS_SECRET,
        expiresIn: this.TEMP_JWT_ACCESS_EXPIRY
      }
    );
  }

  async decodeToken(access_token: string) {
    try {
      access_token = access_token?.toLowerCase?.().startsWith('bearer ')
      ? access_token.slice(7).trim()
      : access_token;
    

      let decode = await this.jwtService.verifyAsync(access_token, {
        secret: this.JWT_ACCESS_SECRET
      });

      return decode
    } catch (error) {
      throw error
    }
  }

  setOptions = async (pagination: any, limit: any) => {
    try {
      let options: any = {
        lean: true,
        sort: { _id: -1 }
      }
      if (pagination == undefined && limit == undefined) {
        options = {
          lean: true,
          sort: { _id: -1 },
          limit: 100,
          pagination: 0,
          skip: 0
        }
      }

      else if (pagination == undefined && typeof limit != undefined) {
        options = {
          lean: true,
          sort: { _id: -1 },
          limit: parseInt(limit),
          skip: 0,
        }
      }
      else if (typeof pagination != undefined && limit == undefined) {
        options = {
          lean: true,
          sort: { _id: -1 },
          skip: parseInt(pagination) * 10,
          limit: 10
        }
      }

      else if (typeof pagination != undefined && typeof limit != undefined) {
        options = {
          lean: true,
          sort: { _id: -1 },
          limit: parseInt(limit),
          skip: parseInt(pagination) * limit
        }
      }

      return options

    }
    catch (err) {
      throw err;
    }
  }
}