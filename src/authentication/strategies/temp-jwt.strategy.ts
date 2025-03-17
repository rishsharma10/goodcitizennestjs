import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User , UserDocument} from '../../user/entities/user.entity';

@Injectable()
export class TempStrategy extends PassportStrategy(Strategy, 'temp-jwt') {
    constructor(
        private configService: ConfigService,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>("TEMP_JWT_ACCESS_SECRET")!
        })
    }

    async validate(payload: any) {
        const query = { _id: payload._id, is_deleted: false }
        let projection = { password: 0 }
        let option = { lean: true }
        const user = await this.userModel.findById(query, projection, option);
        if (!user) return null;
        return user;
    }
}