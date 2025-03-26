import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { DriverService } from './driver.service';
import { RideDto } from './dto/driver.dto';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { UserType } from 'src/common/utils';
import { Roles } from 'src/authentication/roles.decorator';
import { JwtAuthGuard } from 'src/authentication/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authentication/guards/roles.guard';

@Controller({ path: 'driver', version: '1' })
export class DriverController {
  constructor(private readonly driverService: DriverService) { }


  /**
  *  Will handle the user profile controller logic
  * @returns
  */
  @ApiBearerAuth("authorization")
  @Roles(UserType.DRIVER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('profile')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `Driver profile Api` })
  async profile(@Req() req) {
    return await this.driverService.profile(req.user);
  }


  /**
  * Will handle the user and driver Signup controller logic
  * @param {RideDto} dto - The data of pickup and drop location
  * @returns 
  */
  @ApiBearerAuth("authorization")
  @Roles(UserType.DRIVER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('start-ride')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User Signup Api` })
  async start_ride(@Body() dto: RideDto, @Req() req) {
    return await this.driverService.start_ride(dto, req.user);
  }
}
