import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User , UserDocument} from '../../user/entities/user.entity';
import { Session, SessionDocument } from '../../user/entities/session.entity';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private configService: ConfigService,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>("JWT_ACCESS_SECRET")!
        }) 
    }

    async validate(payload: any) {
        const query = { _id: payload._id, is_deleted: false }
        let projection = { password: 0 }
        let option = { lean: true }
        const user = await this.userModel.findById(query, projection, option);
        if (!user) return null;
        const sessionQuery = { _id: payload.session_id }
        const session = await this.sessionModel.findById(sessionQuery, projection, option);
        if (!session) return null;
        Object.assign(user, { session_id: payload.session_id })
        return user;
    }
}

