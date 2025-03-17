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

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: "globalSecret",
        signOptions: { expiresIn: configService.get<string>('JWT_ACCESS_EXPIRY', '1h') },
      }),
    }),
    DriverModule, 
    UserModule, 
    WebSocketModule
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy,  VerificationStrategy, TempStrategy, RolesGuard],
})
export class AppModule {}
