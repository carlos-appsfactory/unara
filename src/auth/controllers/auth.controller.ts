import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Logger,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
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

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger('AuthController');

  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
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
}
