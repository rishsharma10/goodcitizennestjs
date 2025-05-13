import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DriverModule } from './driver/driver.module';
import { UserModule } from './user/user.module';
import { WebSocketModule } from './web-socket/web-socket.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './authentication/strategies/jwt.strategy';
import { VerificationStrategy } from './authentication/strategies/verification.strategy';
import { TempStrategy } from './authentication/strategies/temp-jwt.strategy';
import { RolesGuard } from './authentication/guards/roles.guard';
import { JwtModule } from '@nestjs/jwt';
import { CommonService } from './common/common.service';
import { modelDefinitions } from './user/entities';
import { commonModelDefinitions } from './entities';
import { FirebaseModule } from 'nestjs-firebase';
import { rideModelDefinitions } from './driver/entities';
import { AdminModule } from './admin/admin.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
      }),
    }),
    MongooseModule.forFeature([...modelDefinitions, ...commonModelDefinitions,...rideModelDefinitions]),
    FirebaseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        googleApplicationCredential: {
          projectId: configService.get<string>('PROJECT_ID'),
          clientEmail: configService.get<string>('CLIENT_EMAIL'),
          privateKey: configService.get<string>('PRIVATE_KEY')
        }
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET', 'defaultSecret'),
        signOptions: { expiresIn: configService.get<string>('JWT_ACCESS_EXPIRY', '1d') },
      }),
    }),
    DriverModule,
    UserModule,
    WebSocketModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, CommonService, JwtStrategy, VerificationStrategy, TempStrategy, RolesGuard],
})
export class AppModule { }
