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

  

 
}
