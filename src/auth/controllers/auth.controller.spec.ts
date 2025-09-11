import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService, RegistrationResponse } from '../services/auth.service';
import { EmailVerificationService } from '../services/email-verification.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { OAuthService } from '../services/oauth.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { VerifyEmailDto, ResendVerificationDto } from '../dto/verify-email.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { LoginResponseDto } from '../dto/login-response.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { TokenPair } from '../interfaces/jwt-payload.interface';
import { User } from '../../users/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let emailVerificationService: jest.Mocked<EmailVerificationService>;
  let tokenBlacklistService: jest.Mocked<TokenBlacklistService>;
  let oauthService: jest.Mocked<OAuthService>;

  const mockUserResponse: UserResponseDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    email_verified: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockTokens: TokenPair = {
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token',
  };

  const mockRegistrationResponse: RegistrationResponse = {
    user: mockUserResponse,
    tokens: mockTokens,
    verificationToken: 'verification-token-123',
  };

  const mockLoginResponse: LoginResponseDto = {
    user: mockUserResponse,
    tokens: mockTokens,
  };

  const mockCreateUserDto: CreateUserDto = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'StrongPass123!',
  };

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    password_hash: 'hashed_password_123',
    fullname: 'Test User',
    email_verified: true,
    email_verification_token: null,
    email_verification_expires_at: null,
    last_login: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };

    const mockEmailVerificationService = {
      verifyEmailToken: jest.fn(),
      resendVerificationToken: jest.fn(),
    };

    const mockTokenBlacklistService = {
      blacklistToken: jest.fn(),
      isTokenBlacklisted: jest.fn(),
    };

    const mockOAuthService = {
      authenticateWithOAuth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
        {
          provide: OAuthService,
          useValue: mockOAuthService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    emailVerificationService = module.get(EmailVerificationService);
    tokenBlacklistService = module.get(TokenBlacklistService);
    oauthService = module.get(OAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      authService.register.mockResolvedValue(mockRegistrationResponse);

      const result = await controller.register(mockCreateUserDto);

      expect(result).toEqual(mockRegistrationResponse);
      expect(authService.register).toHaveBeenCalledWith(mockCreateUserDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });

    it('should return user data and tokens on successful registration', async () => {
      authService.register.mockResolvedValue(mockRegistrationResponse);

      const result = await controller.register(mockCreateUserDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(mockCreateUserDto.email);
      expect(result.user.username).toBe(mockCreateUserDto.username);
      expect(result.user.id).toBe(mockUserResponse.id);
      expect(result.tokens.accessToken).toBe(mockTokens.accessToken);
      expect(result.tokens.refreshToken).toBe(mockTokens.refreshToken);
    });

    it('should throw ConflictException when email already exists', async () => {
      const conflictError = new ConflictException(
        `Email '${mockCreateUserDto.email}' is already registered`,
      );
      authService.register.mockRejectedValue(conflictError);

      await expect(controller.register(mockCreateUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(controller.register(mockCreateUserDto)).rejects.toThrow(
        `Email '${mockCreateUserDto.email}' is already registered`,
      );

      expect(authService.register).toHaveBeenCalledWith(mockCreateUserDto);
    });

    it('should throw ConflictException when username already exists', async () => {
      const conflictError = new ConflictException(
        `Username '${mockCreateUserDto.username}' is already taken`,
      );
      authService.register.mockRejectedValue(conflictError);

      await expect(controller.register(mockCreateUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(controller.register(mockCreateUserDto)).rejects.toThrow(
        `Username '${mockCreateUserDto.username}' is already taken`,
      );

      expect(authService.register).toHaveBeenCalledWith(mockCreateUserDto);
    });

    it('should propagate service errors', async () => {
      const serviceError = new Error('Database connection failed');
      authService.register.mockRejectedValue(serviceError);

      await expect(controller.register(mockCreateUserDto)).rejects.toThrow(
        serviceError,
      );

      expect(authService.register).toHaveBeenCalledWith(mockCreateUserDto);
    });

    it('should handle validation errors from DTO', async () => {
      const invalidDto = {
        email: 'invalid-email',
        username: 'ab', // Too short
        password: '123', // Too weak
      } as CreateUserDto;

      const validationError = new Error('Validation failed');
      authService.register.mockRejectedValue(validationError);

      await expect(controller.register(invalidDto)).rejects.toThrow(
        validationError,
      );
    });

    it('should not expose sensitive user data in response', async () => {
      authService.register.mockResolvedValue(mockRegistrationResponse);

      const result = await controller.register(mockCreateUserDto);

      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('username');
      expect(result.user).toHaveProperty('email_verified');
      expect(result.user).toHaveProperty('createdAt');
      expect(result.user).toHaveProperty('updatedAt');
    });

    it('should maintain proper response structure', async () => {
      authService.register.mockResolvedValue(mockRegistrationResponse);

      const result = await controller.register(mockCreateUserDto);

      expect(typeof result).toBe('object');
      expect(typeof result.user).toBe('object');
      expect(typeof result.tokens).toBe('object');
      expect(typeof result.tokens.accessToken).toBe('string');
      expect(typeof result.tokens.refreshToken).toBe('string');
    });

    it('should handle concurrent registration attempts', async () => {
      authService.register.mockResolvedValue(mockRegistrationResponse);

      const promises = [
        controller.register(mockCreateUserDto),
        controller.register(mockCreateUserDto),
        controller.register(mockCreateUserDto),
      ];

      await Promise.all(promises);

      expect(authService.register).toHaveBeenCalledTimes(3);
    });

    it('should pass through all DTO properties to service', async () => {
      const dtoWithAllFields: CreateUserDto = {
        email: 'detailed@example.com',
        username: 'detaileduser',
        password: 'VeryStrongPassword123!',
      };

      authService.register.mockResolvedValue(mockRegistrationResponse);

      await controller.register(dtoWithAllFields);

      expect(authService.register).toHaveBeenCalledWith(dtoWithAllFields);
      expect(authService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'detailed@example.com',
          username: 'detaileduser',
          password: 'VeryStrongPassword123!',
        }),
      );
    });
  });

  describe('verifyEmail', () => {
    const mockVerifyEmailDto: VerifyEmailDto = {
      token: 'verification-token-123',
    };

    it('should successfully verify email with valid token', async () => {
      emailVerificationService.verifyEmailToken.mockResolvedValue(mockUser);

      const result = await controller.verifyEmail(mockVerifyEmailDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email verified successfully');
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe(mockUser.id);
      expect(result.user?.email).toBe(mockUser.email);
      expect(result.user?.username).toBe(mockUser.username);
      expect(result.user?.email_verified).toBe(mockUser.email_verified);

      expect(emailVerificationService.verifyEmailToken).toHaveBeenCalledWith(
        mockVerifyEmailDto.token,
      );
    });

    it('should return failure response for invalid token', async () => {
      emailVerificationService.verifyEmailToken.mockResolvedValue(null);

      const result = await controller.verifyEmail(mockVerifyEmailDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired verification token');
      expect(result.user).toBeUndefined();

      expect(emailVerificationService.verifyEmailToken).toHaveBeenCalledWith(
        mockVerifyEmailDto.token,
      );
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      emailVerificationService.verifyEmailToken.mockRejectedValue(error);

      await expect(controller.verifyEmail(mockVerifyEmailDto)).rejects.toThrow(
        error,
      );

      expect(emailVerificationService.verifyEmailToken).toHaveBeenCalledWith(
        mockVerifyEmailDto.token,
      );
    });
  });

  describe('resendVerification', () => {
    const mockResendVerificationDto: ResendVerificationDto = {
      email: 'test@example.com',
    };

    it('should successfully resend verification for valid email', async () => {
      emailVerificationService.resendVerificationToken.mockResolvedValue(
        'new-token-456',
      );

      const result = await controller.resendVerification(
        mockResendVerificationDto,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'If this email is registered, a verification email will be sent',
      );

      expect(
        emailVerificationService.resendVerificationToken,
      ).toHaveBeenCalledWith(mockResendVerificationDto.email);
    });

    it('should return success response even on service error to prevent email enumeration', async () => {
      const error = new Error('User not found');
      emailVerificationService.resendVerificationToken.mockRejectedValue(error);

      const result = await controller.resendVerification(
        mockResendVerificationDto,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'If this email is registered, a verification email will be sent',
      );

      expect(
        emailVerificationService.resendVerificationToken,
      ).toHaveBeenCalledWith(mockResendVerificationDto.email);
    });

    it('should handle service success without exposing internal details', async () => {
      emailVerificationService.resendVerificationToken.mockResolvedValue(
        'token-789',
      );

      const result = await controller.resendVerification(
        mockResendVerificationDto,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'If this email is registered, a verification email will be sent',
      );
      expect(result.user).toBeUndefined(); // Don't expose user details
    });
  });

  describe('login', () => {
    const mockRequest = {
      headers: {},
      socket: { remoteAddress: '192.168.1.1' },
    } as any;

    it('should successfully login user with email', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.password = 'password123';

      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto, mockRequest);

      expect(authService.login).toHaveBeenCalledWith(loginDto, '192.168.1.1');
      expect(result).toEqual(mockLoginResponse);
      expect(result.user.id).toBe(mockUserResponse.id);
      expect(result.tokens.accessToken).toBe(mockTokens.accessToken);
    });

    it('should successfully login user with username', async () => {
      const loginDto = new LoginUserDto();
      loginDto.username = 'testuser';
      loginDto.password = 'password123';

      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto, mockRequest);

      expect(authService.login).toHaveBeenCalledWith(loginDto, '192.168.1.1');
      expect(result).toEqual(mockLoginResponse);
      expect(result.user.username).toBe(mockUserResponse.username);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.password = 'wrongpassword';

      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.login).toHaveBeenCalledWith(loginDto, '192.168.1.1');
    });

    it('should throw UnauthorizedException when no identifier provided', async () => {
      const loginDto = new LoginUserDto();
      loginDto.password = 'password123';

      authService.login.mockRejectedValue(
        new UnauthorizedException('Email or username is required'),
      );

      await expect(controller.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle service errors gracefully', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.password = 'password123';

      const error = new Error('Database connection failed');
      authService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto, mockRequest)).rejects.toThrow(
        error,
      );
      expect(authService.login).toHaveBeenCalledWith(loginDto, '192.168.1.1');
    });

    it('should log successful login attempts', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.password = 'password123';

      const loggerSpy = jest.spyOn(controller['logger'], 'log');
      authService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(loginDto, mockRequest);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Login request for identifier: test@example.com from IP: 192.168.1.1',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        `Login successful for user: ${mockUserResponse.id}`,
      );
    });

    it('should log failed login attempts', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.password = 'wrongpassword';

      const loggerSpy = jest.spyOn(controller['logger'], 'error');
      const error = new UnauthorizedException('Invalid credentials');
      authService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto, mockRequest)).rejects.toThrow(
        error,
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        'Login failed for test@example.com: Invalid credentials',
      );
    });

    it('should handle login with both email and username (email takes precedence)', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.username = 'testuser';
      loginDto.password = 'password123';

      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto, mockRequest);

      expect(authService.login).toHaveBeenCalledWith(loginDto, '192.168.1.1');
      expect(result).toEqual(mockLoginResponse);
    });

    it('should return proper response structure', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.password = 'password123';

      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto, mockRequest);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('username');
      expect(result.user).toHaveProperty('email_verified');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should not expose sensitive information in logs', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.password = 'supersecretpassword';

      const loggerSpy = jest.spyOn(controller['logger'], 'log');
      authService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(loginDto, mockRequest);

      const logCalls = loggerSpy.mock.calls.flat();
      logCalls.forEach((call) => {
        expect(call).not.toContain('supersecretpassword');
      });
    });

    it('should handle empty string identifiers', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = '';
      loginDto.password = 'password123';

      authService.login.mockRejectedValue(
        new UnauthorizedException('Email or username is required'),
      );

      await expect(controller.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should validate login DTO structure', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.password = 'password123';

      authService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(loginDto, mockRequest);

      expect(authService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123',
        }),
        '192.168.1.1',
      );
    });

    it('should handle rate limiting scenarios', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.password = 'password123';

      authService.login.mockResolvedValue(mockLoginResponse);

      // Simulate multiple rapid calls
      const promises = Array(3)
        .fill(null)
        .map(() => {
          const dto = new LoginUserDto();
          dto.email = 'test@example.com';
          dto.password = 'password123';
          return controller.login(dto, mockRequest);
        });
      await Promise.all(promises);

      expect(authService.login).toHaveBeenCalledTimes(3);
    });

    it('should extract IP from X-Forwarded-For header', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.password = 'password123';

      const requestWithForwardedFor = {
        headers: { 'x-forwarded-for': '203.0.113.1, 192.168.1.1' },
        socket: { remoteAddress: '10.0.0.1' },
      } as any;

      authService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(loginDto, requestWithForwardedFor);

      expect(authService.login).toHaveBeenCalledWith(loginDto, '203.0.113.1');
    });

    it('should extract IP from X-Real-IP header', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.password = 'password123';

      const requestWithRealIp = {
        headers: { 'x-real-ip': '203.0.113.2' },
        socket: { remoteAddress: '10.0.0.1' },
      } as any;

      authService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(loginDto, requestWithRealIp);

      expect(authService.login).toHaveBeenCalledWith(loginDto, '203.0.113.2');
    });

    it('should handle TooManyRequestsException for locked accounts', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.password = 'password123';

      const tooManyRequestsError = new HttpException(
        'Account temporarily locked due to too many failed attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
      authService.login.mockRejectedValue(tooManyRequestsError);

      await expect(controller.login(loginDto, mockRequest)).rejects.toThrow(
        HttpException,
      );
      expect(authService.login).toHaveBeenCalledWith(loginDto, '192.168.1.1');
    });

    it('should fallback to unknown IP when no headers or socket info available', async () => {
      const loginDto = new LoginUserDto();
      loginDto.email = 'test@example.com';
      loginDto.password = 'password123';

      const requestWithoutIp = {
        headers: {},
        socket: {},
      } as any;

      authService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(loginDto, requestWithoutIp);

      expect(authService.login).toHaveBeenCalledWith(loginDto, 'unknown');
    });
  });

  describe('Password Recovery', () => {
    describe('forgotPassword', () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'user@example.com',
      };

      it('should successfully initiate password reset', async () => {
        authService.forgotPassword.mockResolvedValue(undefined);

        const result = await controller.forgotPassword(forgotPasswordDto);

        expect(authService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
        expect(result).toEqual({
          message: 'If this email is registered, you will receive a password reset link shortly.',
        });
      });

      it('should return success message even when service throws error', async () => {
        authService.forgotPassword.mockRejectedValue(new Error('Service error'));

        const result = await controller.forgotPassword(forgotPasswordDto);

        expect(authService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
        expect(result).toEqual({
          message: 'If this email is registered, you will receive a password reset link shortly.',
        });
      });

      it('should prevent user enumeration by always returning same response', async () => {
        const nonExistentEmailDto: ForgotPasswordDto = {
          email: 'nonexistent@example.com',
        };

        authService.forgotPassword.mockResolvedValue(undefined);

        const result = await controller.forgotPassword(nonExistentEmailDto);

        expect(result).toEqual({
          message: 'If this email is registered, you will receive a password reset link shortly.',
        });
      });
    });

    describe('resetPassword', () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'valid-reset-token-123',
        newPassword: 'NewSecurePass123!',
      };

      it('should successfully reset password with valid token', async () => {
        authService.resetPassword.mockResolvedValue(undefined);

        const result = await controller.resetPassword(resetPasswordDto);

        expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
        expect(result).toEqual({
          message: 'Password has been reset successfully. Please login with your new password.',
        });
      });

      it('should throw error for invalid token', async () => {
        const invalidTokenDto: ResetPasswordDto = {
          token: 'invalid-token',
          newPassword: 'NewSecurePass123!',
        };

        authService.resetPassword.mockRejectedValue(
          new UnauthorizedException('Invalid reset token')
        );

        await expect(controller.resetPassword(invalidTokenDto)).rejects.toThrow(
          UnauthorizedException
        );
        expect(authService.resetPassword).toHaveBeenCalledWith(invalidTokenDto);
      });

      it('should throw error for expired token', async () => {
        const expiredTokenDto: ResetPasswordDto = {
          token: 'expired-token-123',
          newPassword: 'NewSecurePass123!',
        };

        authService.resetPassword.mockRejectedValue(
          new UnauthorizedException('Reset token has expired')
        );

        await expect(controller.resetPassword(expiredTokenDto)).rejects.toThrow(
          UnauthorizedException
        );
        expect(authService.resetPassword).toHaveBeenCalledWith(expiredTokenDto);
      });

      it('should handle database errors gracefully', async () => {
        authService.resetPassword.mockRejectedValue(
          new Error('Database connection failed')
        );

        await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
          'Database connection failed'
        );
      });
    });
  });
});
