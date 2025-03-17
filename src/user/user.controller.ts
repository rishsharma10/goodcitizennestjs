import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards,Req} from '@nestjs/common';
import { UserService } from './user.service';
import { OtpDto, SignupDto } from './dto/create-user.dto';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { UserType } from 'src/common/utils';
import { Roles } from 'src/authentication/roles.decorator';
import { TempAuthGuard } from 'src/authentication/guards/temp-auth.guard';
import { RolesGuard } from 'src/authentication/guards/roles.guard';

@Controller({ path: 'user', version: '1' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Will handle the user Signup controller logic
   * @param {SignupDto} dto - The user signup data
   * @returns 
   */
  @Post('signup')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User Signup Api` })
  async signup(@Body() dto: SignupDto) {
    return await this.userService.signup(dto);
  }

  /**
   *  Will handle the user verification controller logic
   * @param {OtpDto } dto
   * @returns
   */
  @ApiBearerAuth("authorization")
  @Roles(UserType.USER)
  @UseGuards(TempAuthGuard, RolesGuard)
  @Patch('verify/otp')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User Verify Otp Api` })
  async verify_otp(@Body() dto: OtpDto, @Req() req) {
    return await this.userService.verify_otp(dto, req.user);
  }
}
