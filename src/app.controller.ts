import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { LoginDto, OtpDto, SignupDto } from './user/dto/create-user.dto';
import { Roles } from './authentication/roles.decorator';
import { UserType } from './common/utils';
import { TempAuthGuard } from './authentication/guards/temp-auth.guard';
import { RolesGuard } from './authentication/guards/roles.guard';

@Controller({ path: 'app', version: '1' })
export class AppController {
    constructor(private readonly appService: AppService) {}
    
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
     async login(@Body() dto: LoginDto,@Res({passthrough: true})res: Response) {
       return await this.appService.login(dto,res);
     }
  }

