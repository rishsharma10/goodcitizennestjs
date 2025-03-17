import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class TempAuthGuard extends AuthGuard('temp-jwt') {
    handleRequest(err, user, info, context: ExecutionContext) {
        if (info?.name === 'TokenExpiredError') {
            console.log("TokenExpiredError");
            
            throw new UnauthorizedException({ message: 'Token expired', errorCode: 'TOKEN_EXPIRED' });
        }

        if (info?.name === 'JsonWebTokenError') {
            console.log("JsonWebTokenError");
            throw new UnauthorizedException({ message: 'Invalid token', errorCode: 'INVALID_TOKEN' });
        }

        if (!user) {
            throw new UnauthorizedException();
        }
        return user
    }
}
