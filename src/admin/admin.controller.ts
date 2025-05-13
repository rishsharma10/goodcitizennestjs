import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { AdminLoginDto, Idto, Listing, ListingDto } from './dto/create-admin.dto';
import { UserType } from 'src/common/utils';
import { Roles } from 'src/authentication/roles.decorator';
import { JwtAuthGuard } from 'src/authentication/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authentication/guards/roles.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `Admin login Api` })
  @Post('login')
  async login(@Body() dto: AdminLoginDto): Promise<any> {
    return await this.adminService.login(dto)
  }

  @ApiBearerAuth("authorization")
  @Roles(UserType.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `Admin user list Api` })
  @Get('usersList')
  async usersList(@Query() dto: Listing): Promise<any> {
    return await this.adminService.userList(dto)
  }

  @ApiBearerAuth("authorization")
  @Roles(UserType.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `Admin user/driver detail pi` })
  @Get('user/detail/:id')
  async user_detail(@Param() ID: Idto): Promise<any> {
    return await this.adminService.user_detail(ID.id)
  }

  @ApiBearerAuth("authorization")
  @Roles(UserType.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `Admin driver list Api` })
  @Get('driverList')
  async driverList(@Query() dto: Listing): Promise<any> {
    return await this.adminService.driverList(dto)
  }

  @ApiBearerAuth("authorization")
  @Roles(UserType.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `Admin driver list Api` })
  @Get('driver-ride/List/:id')
  async driver_ride_list(@Param() ID: Idto, @Query() dto: ListingDto): Promise<any> {
    return await this.adminService.driver_ride_list(ID.id, dto)
  }
}
