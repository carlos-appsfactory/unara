import {
  Controller,
  Post,
  Get,
  Body,
  HttpStatus,
  HttpCode,
  Logger,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { AuthService, RegistrationResponse } from '../services/auth.service';
import { EmailVerificationService } from '../services/email-verification.service';
import {
  VerifyEmailDto,
  ResendVerificationDto,
  VerificationResponseDto,
} from '../dto/verify-email.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { LoginResponseDto } from '../dto/login-response.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import { TokenBlacklistService } from '../services/token-blacklist.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger('AuthController');

  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  /**
   * User registration endpoint
   * POST /auth/register
   *
   * @param createUserDto - User registration data with validation
   * @returns User data and JWT tokens
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<RegistrationResponse> {
    this.logger.log(`Registration request for email: ${createUserDto.email}`);

    try {
      const result = await this.authService.register(createUserDto);

      this.logger.log(`Registration successful for user: ${result.user.id}`);

      return result;
    } catch (error) {
      this.logger.error(
        `Registration failed for ${createUserDto.email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Email verification endpoint
   * POST /auth/verify-email
   *
   * @param verifyEmailDto - Email verification data with token
   * @returns Verification success response
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<VerificationResponseDto> {
    this.logger.log(
      `Email verification request for token: ${verifyEmailDto.token}`,
    );

    try {
      const user = await this.emailVerificationService.verifyEmailToken(
        verifyEmailDto.token,
      );

      if (!user) {
        this.logger.warn(
          `Email verification failed - invalid or expired token: ${verifyEmailDto.token}`,
        );
        return {
          success: false,
          message: 'Invalid or expired verification token',
        };
      }

      this.logger.log(`Email verification successful for user: ${user.id}`);

      return {
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          email_verified: user.email_verified,
        },
      };
    } catch (error) {
      this.logger.error(
        `Email verification failed for token ${verifyEmailDto.token}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Resend email verification endpoint
   * POST /auth/resend-verification
   *
   * @param resendVerificationDto - Email address for resending verification
   * @returns Resend confirmation response
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ): Promise<VerificationResponseDto> {
    this.logger.log(
      `Verification resend request for email: ${resendVerificationDto.email}`,
    );

    try {
      await this.emailVerificationService.resendVerificationToken(
        resendVerificationDto.email,
      );

      this.logger.log(
        `Verification resend successful for email: ${resendVerificationDto.email}`,
      );

      return {
        success: true,
        message:
          'If this email is registered, a verification email will be sent',
      };
    } catch (error) {
      this.logger.error(
        `Verification resend failed for ${resendVerificationDto.email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Return success message even for errors to avoid email enumeration
      return {
        success: true,
        message:
          'If this email is registered, a verification email will be sent',
      };
    }
  }

  /**
   * User login endpoint
   * POST /auth/login
   *
   * @param loginUserDto - Login credentials (email/username + password)
   * @returns User data and JWT tokens
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ login: { limit: 5, ttl: 60000 } })
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    const identifier = loginUserDto.getIdentifier();
    const ipAddress = this.getClientIp(request);

    this.logger.log(
      `Login request for identifier: ${identifier} from IP: ${ipAddress}`,
    );

    try {
      const result = await this.authService.login(loginUserDto, ipAddress);

      this.logger.log(`Login successful for user: ${result.user.id}`);

      return result;
    } catch (error) {
      this.logger.error(
        `Login failed for ${identifier}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Extracts client IP address from request headers and connection info
   * @param request - Express request object
   * @returns Client IP address
   */
  private getClientIp(request: Request): string {
    // Check various headers that might contain the real client IP
    const xForwardedFor = request.headers['x-forwarded-for'];
    const xRealIp = request.headers['x-real-ip'];
    const cfConnectingIp = request.headers['cf-connecting-ip']; // Cloudflare

    if (xForwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ips = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : xForwardedFor;
      return ips.split(',')[0].trim();
    }

    if (xRealIp) {
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    }

    if (cfConnectingIp) {
      return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
    }

    // Fallback to connection remote address
    return request.socket.remoteAddress || 'unknown';
  }

  /**
   * Get current authenticated user profile
   * @param user - Current authenticated user from JWT
   * @returns User profile data
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: JwtPayload): Promise<JwtPayload> {
    this.logger.log(`Profile request for user: ${user.sub}`);
    
    return {
      sub: user.sub,
      email: user.email,
      username: user.username,
      iat: user.iat,
      exp: user.exp,
    };
  }

  /**
   * Refresh access token using refresh token
   * @param request - Express request containing refresh token
   * @param user - Current authenticated user
   * @returns New token pair
   */
  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    this.logger.log(`Token refresh request for user: ${user.sub}`);

    // Extract refresh token from request body or Authorization header
    const refreshToken = (request.body as any)?.refreshToken;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      // Generate new token pair
      const tokens = await this.authService.refreshTokens(refreshToken, user.email, user.username);
      
      this.logger.log(`Token refresh successful for user: ${user.sub}`);
      
      return tokens;
    } catch (error) {
      this.logger.error(
        `Token refresh failed for user ${user.sub}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Logout user and invalidate refresh token
   * @param request - Express request
   * @param user - Current authenticated user
   * @returns Success message
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    this.logger.log(`Logout request for user: ${user.sub}`);

    const refreshToken = (request.body as any)?.refreshToken;
    
    // Blacklist the current access token for immediate invalidation
    if (user.jti) {
      try {
        this.tokenBlacklistService.blacklistToken(user.jti);
        this.logger.log(`Access token blacklisted for user: ${user.sub}`);
      } catch (error) {
        this.logger.error(
          `Error blacklisting access token for user ${user.sub}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // Continue with logout even if blacklisting fails
      }
    }
    
    // Invalidate the refresh token
    if (refreshToken) {
      try {
        await this.authService.logout(refreshToken);
        this.logger.log(`Refresh token invalidated for user: ${user.sub}`);
      } catch (error) {
        this.logger.error(
          `Error during logout for user ${user.sub}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // Continue with logout even if refresh token invalidation fails
      }
    }

    this.logger.log(`Logout successful for user: ${user.sub}`);
    return { message: 'Logout successful' };
  }
}
