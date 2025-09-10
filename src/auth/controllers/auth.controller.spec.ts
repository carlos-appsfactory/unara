import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService, RegistrationResponse } from '../services/auth.service';
import { EmailVerificationService } from '../services/email-verification.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { VerifyEmailDto, ResendVerificationDto } from '../dto/verify-email.dto';
import { TokenPair } from '../interfaces/jwt-payload.interface';
import { User } from '../../users/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let emailVerificationService: jest.Mocked<EmailVerificationService>;

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
    };

    const mockEmailVerificationService = {
      verifyEmailToken: jest.fn(),
      resendVerificationToken: jest.fn(),
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
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    emailVerificationService = module.get(EmailVerificationService);
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
});
