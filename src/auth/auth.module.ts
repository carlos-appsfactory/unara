import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CommonModule } from '../common/common.module';
import { EnhancedThrottlerGuard } from '../common/guards/enhanced-throttler.guard';
import { PasswordService } from './services/password.service';
import { JwtAuthService } from './services/jwt-auth.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { AuthService } from './services/auth.service';
import { EmailVerificationService } from './services/email-verification.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { TokenCleanupService } from './services/token-cleanup.service';
import { PasswordResetTokenService } from './services/password-reset-token.service';
import { OAuthService } from './services/oauth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { MicrosoftAuthGuard } from './guards/microsoft-auth.guard';
import { AppleAuthGuard } from './guards/apple-auth.guard';
import { AuthController } from './controllers/auth.controller';
import { User } from '../users/entities/user.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { LoginAttemptService } from './services/login-attempt.service';
import { IsEmailUniqueConstraint } from './validators/is-email-unique.validator';
import { IsUsernameUniqueConstraint } from './validators/is-username-unique.validator';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    PassportModule,
    TypeOrmModule.forFeature([RefreshToken, PasswordResetToken, User, LoginAttempt, OAuthProvider]),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          name: 'login',
          ttl: 60 * 1000, // 1 minute
          limit: 5, // 5 attempts per minute per IP
        },
        {
          name: 'password_reset',
          ttl: 60 * 60 * 1000, // 1 hour
          limit: 3, // 3 requests per hour per IP for forgot password
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
    PasswordResetTokenService,
    OAuthService,
    JwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
    MicrosoftStrategy,
    AppleStrategy,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    GoogleAuthGuard,
    FacebookAuthGuard,
    MicrosoftAuthGuard,
    AppleAuthGuard,
    IsEmailUniqueConstraint,
    IsUsernameUniqueConstraint,
    EnhancedThrottlerGuard,
    {
      provide: APP_GUARD,
      useClass: EnhancedThrottlerGuard,
    },
  ],
  exports: [
    PasswordService,
    RefreshTokenService,
    JwtAuthService,
    AuthService,
    EmailVerificationService,
    PasswordResetTokenService,
    OAuthService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
})
export class AuthModule {}
