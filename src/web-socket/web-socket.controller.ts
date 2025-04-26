import { WebSocketService } from './web-socket.service';
import { DriverLatLong, LatLong } from './dto/web-socket.dto';
import { Controller, Get, Injectable, Query, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { Roles } from 'src/authentication/roles.decorator';
import { UserType } from 'src/common/utils';
import { JwtAuthGuard } from 'src/authentication/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authentication/guards/roles.guard';

@Controller({ path: 'web-socket', version: '1' })
export class WebSocketController {
  constructor(private readonly webSocketService: WebSocketService) {}

  @ApiBearerAuth("authorization")
  @Roles(UserType.DRIVER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('findUsersAhead')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `Users ahead Api` })
  async findUsersAhead(@Query() payload: DriverLatLong,@Req() req) {
  let driver = await this.webSocketService.save_coordinates(req.user._id, payload);
  return  await this.webSocketService.findUsersAhead(driver._id,driver.ride_id,driver?.latitude,
    driver?.longitude,driver?.direction,2, false);
  }  
}  
