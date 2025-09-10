import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PasswordService } from './services/password.service';
import { JwtAuthService } from './services/jwt-auth.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([RefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
          algorithm: 'HS256',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    PasswordService, 
    RefreshTokenService, 
    JwtAuthService,
    JwtStrategy,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [
    PasswordService, 
    RefreshTokenService, 
    JwtAuthService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
})
export class AuthModule {}