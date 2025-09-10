import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PasswordService } from './services/password.service';
import { JwtAuthService } from './services/jwt-auth.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { AuthService } from './services/auth.service';
import { EmailVerificationService } from './services/email-verification.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { TokenCleanupService } from './services/token-cleanup.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt.guard';
import { AuthController } from './controllers/auth.controller';
import { User } from '../users/entities/user.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { LoginAttemptService } from './services/login-attempt.service';
import { IsEmailUniqueConstraint } from './validators/is-email-unique.validator';
import { IsUsernameUniqueConstraint } from './validators/is-username-unique.validator';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([RefreshToken, User, LoginAttempt]),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          name: 'login',
          ttl: 60 * 1000, // 1 minute
          limit: 5, // 5 attempts per minute per IP
        },
        {
          name: 'global',
          ttl: 60 * 1000, // 1 minute
          limit: 20, // 20 requests per minute per IP
        },
      ],
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
          algorithm: 'HS256',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    PasswordService,
    RefreshTokenService,
    JwtAuthService,
    AuthService,
    EmailVerificationService,
    LoginAttemptService,
    TokenBlacklistService,
    TokenCleanupService,
    JwtStrategy,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    IsEmailUniqueConstraint,
    IsUsernameUniqueConstraint,
  ],
  exports: [
    PasswordService,
    RefreshTokenService,
    JwtAuthService,
    AuthService,
    EmailVerificationService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
})
export class AuthModule {}
