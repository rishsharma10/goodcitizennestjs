import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { UserType } from "../../common/utils";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<UserType[]>('roles', context.getHandler());
        console.log("requiredRoles",requiredRoles);
        
        if (!requiredRoles) return true
        const { user } = context.switchToHttp().getRequest();
        return requiredRoles.includes(user.role)
    }
}