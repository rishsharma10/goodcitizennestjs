import { Body, Controller, Delete, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { ForgotPassword, LoginDto, OtpDto, ResendOtp, ResetForgotPassword, SignupDto, VerifyForgotPassword } from './user/dto/create-user.dto';
import { Roles } from './authentication/roles.decorator';
import { UserType } from './common/utils';
import { TempAuthGuard } from './authentication/guards/temp-auth.guard';
import { RolesGuard } from './authentication/guards/roles.guard';
import { VerificationAuthGuard } from './authentication/guards/verification-auth.guard';
import { JwtAuthGuard } from './authentication/guards/jwt-auth.guard';
import { UpdateUserDto } from './user/dto/update-user.dto';

@Controller({ path: 'app', version: '1' })
export class AppController {
  constructor(private readonly appService: AppService) { }

  /**
   * Will handle the user and driver Signup controller logic
   * @param {SignupDto} dto - The user signup data
   * @returns 
   */
  @Post('signup')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User Signup Api` })
  async signup(@Body() dto: SignupDto) {
    return await this.appService.signup(dto);
  }

  /**
   *  Will handle the user and driver verification controller logic
   * @param {OtpDto } dto
   * @returns
   */
  @ApiBearerAuth("authorization")
  @Roles(UserType.USER, UserType.DRIVER)
  @UseGuards(TempAuthGuard, RolesGuard)
  @Patch('verify/otp')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User Verify Otp Api` })
  async verify_otp(@Body() dto: OtpDto, @Req() req) {
    return await this.appService.verify_otp(dto, req.user);
  }

  /**
   *  Will handle the user and driver login controller logic
   * @param {LoginDto} dto - The user login data
   * @returns
  */
  @Post('login')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User Login Api` })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return await this.appService.login(dto, res);
  }

  /**
*  Will handle the user forgot password controller logic
* @param {OtpDto}  dto - The user forgot password data
* @returns
*/
  @Patch('forgot-password')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User Forgot Password Api` })
  async forgot_password(@Body() dto: ForgotPassword) {
    return await this.appService.forgot_password(dto);
  }

  /**
  *  Will handle the user forgot password controller logic
  * @param {OtpDto}  dto - The user forgot password data
  * @returns
  */
  @Patch('verify/forgot-password/otp')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User Verify Forgot Password Otp Api` })
  async verify_forgot_password(@Body() dto: VerifyForgotPassword) {
    return await this.appService.verify_forgot_password(dto);
  }

  /**
   *  Will handle the user forgot password controller logic
   * @param {OtpDto}  dto - The user forgot password data
   * @returns
   */
  @ApiBearerAuth("authorization")
  @Roles(UserType.DRIVER, UserType.USER)
  @UseGuards(VerificationAuthGuard, RolesGuard)
  @Patch('reset/forgot-password')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User Reset Password Api` })
  async reset_forgot_password(@Body() dto: ResetForgotPassword, @Req() req) {
    return await this.appService.reset_forgot_password(dto, req.user);
  }

  /**
   *  Will handle the user resend otp controller logic
   * @param {ResendOtp} dto - The user login data
   * @returns
   */
  @Patch('resend-otp')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User resend otp Api` })
  async resend_otp(@Body() dto: ResendOtp) {
    return await this.appService.resend_otp(dto);
  }

  /**
    *  Will handle the user profile controller logic
    * @returns
    */
  @ApiBearerAuth("authorization")
  @Roles(UserType.USER, UserType.DRIVER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('profile')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User profile Api` })
  async profile(@Req() req) {
    return await this.appService.profile(req.user);
  }

  /** 
   *  Will handle the user profile controller logic
   * @returns
   */
  @ApiBearerAuth("authorization")
  @Roles(UserType.USER, UserType.DRIVER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('update-profile')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User profile Api` })
  async edit_profile(@Body() dto: UpdateUserDto, @Req() req) {
    return await this.appService.update_profile(dto, req.user);
  }

  /**
   * Will handle the user logout controller logic
   * @param req - The req data 
   * @returns
   */
  @ApiBearerAuth("authorization")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER, UserType.DRIVER)
  @Delete('logout')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: `User Logout Api` })
  async logout(@Req() req) {
    return await this.appService.logout(req.user);
  }
}

