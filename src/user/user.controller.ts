import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Res } from '@nestjs/common';
import { UserService } from './user.service';
import { LoginDto, OtpDto, SignupDto } from './dto/create-user.dto';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { UserType } from 'src/common/utils';
import { Roles } from 'src/authentication/roles.decorator';
import { TempAuthGuard } from 'src/authentication/guards/temp-auth.guard';
import { RolesGuard } from 'src/authentication/guards/roles.guard';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/authentication/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller({ path: 'user', version: '1' })
export class UserController {
  constructor(private readonly userService: UserService) { }

  /**
  *  Will handle the user profile controller logic
  * @returns
  */
  @ApiBearerAuth("authorization")
  @Roles(UserType.USER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('profile')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User profile Api` })
  async profile(@Body() dto: UpdateUserDto, @Req() req) {
    return await this.userService.update_profile(dto,req.user);
  }

  /**
 *  Will handle the edit user profile controller logic
 * @returns
 */
  @ApiBearerAuth("authorization")
  @Roles(UserType.USER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('edit/profile')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `Edit User profile Api` })
  async edit_profile(@Req() req) {
    return await this.userService.profile(req.user);
  }
}
