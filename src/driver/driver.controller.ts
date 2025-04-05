import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { DriverService } from './driver.service';
import { ID, RideDto } from './dto/driver.dto';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { UserType } from 'src/common/utils';
import { Roles } from 'src/authentication/roles.decorator';
import { JwtAuthGuard } from 'src/authentication/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authentication/guards/roles.guard';

@Controller({ path: 'driver', version: '1' })
export class DriverController {
  constructor(private readonly driverService: DriverService) { }

  /**
  * Will handle the driver start ride controller logic
  * @param {RideDto} dto - The data of pickup and drop location
  * @returns 
  */
  @ApiBearerAuth("authorization")
  @Roles(UserType.DRIVER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('start-ride')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `Driver Start Ride  Api` })
  async start_ride(@Body() dto: RideDto, @Req() req) {
    return await this.driverService.start_ride(dto, req.user);
  }

  /**
* Will handle the ride detail controller logic
* @returns 
*/
  @ApiBearerAuth("authorization")
  @Roles(UserType.DRIVER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('ride-detail/:id')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `Driver Ride detail Api` })
  async ride_detail(@Param() ID: ID, @Req() req) {
    return await this.driverService.ride_detail(ID.id, req.user);
  }

  /**
* Will handle the end ride controller logic
* @returns 
*/
  @ApiBearerAuth("authorization")
  @Roles(UserType.DRIVER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('end-ride/:id')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `Driver End Ride Api` })
  async end_ride(@Param() ID: ID, @Req() req) {
    return await this.driverService.end_ride(ID.id, req.user);
  }
}
