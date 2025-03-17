import { SetMetadata } from '@nestjs/common';
import { UserType } from '../common/utils';

export const Roles = (...roles: UserType[]) => SetMetadata('roles', roles);
