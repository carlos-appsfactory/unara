import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthService, RegistrationResponse } from './auth.service';
import { PasswordService } from './password.service';
import { JwtAuthService } from './jwt-auth.service';
import { EmailVerificationService } from './email-verification.service';
import { LoginAttemptService } from './login-attempt.service';
import { PasswordResetTokenService } from './password-reset-token.service';
import { EmailService } from '../../common/services/email.service';
import { User } from '../../users/entities/user.entity';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { TokenPair } from '../interfaces/jwt-payload.interface';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let passwordService: jest.Mocked<PasswordService>;
  let jwtAuthService: jest.Mocked<JwtAuthService>;
  let emailVerificationService: jest.Mocked<EmailVerificationService>;
  let loginAttemptService: jest.Mocked<LoginAttemptService>;
  let passwordResetTokenService: jest.Mocked<PasswordResetTokenService>;
  let emailService: jest.Mocked<EmailService>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    password_hash: 'hashed_password_123',
    fullname: 'Test User',
    email_verified: false,
    email_verification_token: null,
    email_verification_expires_at: null,
    last_login: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockCreateUserDto: CreateUserDto = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'StrongPass123!',
  };

  const mockTokens: TokenPair = {
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token',
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockPasswordService = {
      hashPassword: jest.fn(),
      validatePassword: jest.fn(),
    };

    const mockJwtAuthService = {
      generateTokens: jest.fn(),
    };

    const mockEmailVerificationService = {
      generateVerificationToken: jest.fn(),
    };

    const mockLoginAttemptService = {
      isAccountLocked: jest.fn(),
      recordFailedAttempt: jest.fn(),
      clearSuccessfulAttempt: jest.fn(),
    };

    const mockPasswordResetTokenService = {
      generatePasswordResetToken: jest.fn(),
      validateAndConsumeToken: jest.fn(),
    };

    const mockEmailService = {
      sendPasswordResetEmail: jest.fn(),
      sendEmail: jest.fn(),
      testConnection: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: JwtAuthService,
          useValue: mockJwtAuthService,
        },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
        {
          provide: LoginAttemptService,
          useValue: mockLoginAttemptService,
        },
        {
          provide: PasswordResetTokenService,
          useValue: mockPasswordResetTokenService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    passwordService = module.get(PasswordService);
    jwtAuthService = module.get(JwtAuthService);
    emailVerificationService = module.get(EmailVerificationService);
    loginAttemptService = module.get(LoginAttemptService);
    passwordResetTokenService = module.get(PasswordResetTokenService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    beforeEach(() => {
      userRepository.findOne.mockResolvedValue(null); // No existing user
      passwordService.hashPassword.mockResolvedValue('hashed_password_123');
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);
      emailVerificationService.generateVerificationToken.mockResolvedValue(
        'verification-token-123',
      );
    });

    it('should successfully register a new user', async () => {
      const result: RegistrationResponse =
        await service.register(mockCreateUserDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('verificationToken');
      expect(result.user.email).toBe(mockCreateUserDto.email);
      expect(result.user.username).toBe(mockCreateUserDto.username);
      expect(result.user.id).toBe(mockUser.id);
      expect(result.tokens).toEqual(mockTokens);
      expect(result.verificationToken).toBe('verification-token-123');

      // Verify password was hashed
      expect(passwordService.hashPassword).toHaveBeenCalledWith(
        mockCreateUserDto.password,
      );

      // Verify user was created with hashed password
      expect(userRepository.create).toHaveBeenCalledWith({
        email: mockCreateUserDto.email,
        username: mockCreateUserDto.username,
        password_hash: 'hashed_password_123',
        email_verified: false,
      });

      // Verify user was saved
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);

      // Verify tokens were generated
      expect(jwtAuthService.generateTokens).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
        mockUser.username,
      );

      // Verify email verification token was generated
      expect(
        emailVerificationService.generateVerificationToken,
      ).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw ConflictException when email already exists', async () => {
      const existingUser = { ...mockUser, username: 'differentuser' };
      userRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.register(mockCreateUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(mockCreateUserDto)).rejects.toThrow(
        `Email '${mockCreateUserDto.email}' is already registered`,
      );

      // Verify password was not hashed
      expect(passwordService.hashPassword).not.toHaveBeenCalled();
      // Verify user was not saved
      expect(userRepository.save).not.toHaveBeenCalled();
      // Verify verification token was not generated
      expect(
        emailVerificationService.generateVerificationToken,
      ).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when username already exists', async () => {
      const existingUser = { ...mockUser, email: 'different@example.com' };
      userRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.register(mockCreateUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(mockCreateUserDto)).rejects.toThrow(
        `Username '${mockCreateUserDto.username}' is already taken`,
      );

      // Verify password was not hashed
      expect(passwordService.hashPassword).not.toHaveBeenCalled();
      // Verify user was not saved
      expect(userRepository.save).not.toHaveBeenCalled();
      // Verify verification token was not generated
      expect(
        emailVerificationService.generateVerificationToken,
      ).not.toHaveBeenCalled();
    });

    it('should handle password hashing failure', async () => {
      const error = new Error('Hashing failed');
      passwordService.hashPassword.mockRejectedValue(error);

      await expect(service.register(mockCreateUserDto)).rejects.toThrow(error);

      // Verify user was not saved
      expect(userRepository.save).not.toHaveBeenCalled();
      // Verify tokens were not generated
      expect(jwtAuthService.generateTokens).not.toHaveBeenCalled();
      // Verify verification token was not generated
      expect(
        emailVerificationService.generateVerificationToken,
      ).not.toHaveBeenCalled();
    });

    it('should handle database save failure', async () => {
      const error = new Error('Database save failed');
      userRepository.save.mockRejectedValue(error);

      await expect(service.register(mockCreateUserDto)).rejects.toThrow(error);

      // Verify tokens were not generated
      expect(jwtAuthService.generateTokens).not.toHaveBeenCalled();
      // Verify verification token was not generated
      expect(
        emailVerificationService.generateVerificationToken,
      ).not.toHaveBeenCalled();
    });

    it('should handle JWT token generation failure', async () => {
      const error = new Error('Token generation failed');
      jwtAuthService.generateTokens.mockRejectedValue(error);

      await expect(service.register(mockCreateUserDto)).rejects.toThrow(error);

      // Verify verification token was not generated
      expect(
        emailVerificationService.generateVerificationToken,
      ).not.toHaveBeenCalled();
    });

    it('should handle email verification token generation failure', async () => {
      const error = new Error('Verification token generation failed');
      emailVerificationService.generateVerificationToken.mockRejectedValue(
        error,
      );

      await expect(service.register(mockCreateUserDto)).rejects.toThrow(error);
    });

    it('should set email_verified to false for new users', async () => {
      await service.register(mockCreateUserDto);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email_verified: false,
        }),
      );
    });
  });

  describe('findUserByEmail', () => {
    it('should return user when found by email', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found by email', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      userRepository.findOne.mockRejectedValue(error);

      await expect(service.findUserByEmail('test@example.com')).rejects.toThrow(
        error,
      );
    });
  });

  describe('findUserByUsername', () => {
    it('should return user when found by username', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findUserByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return null when user not found by username', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findUserByUsername('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      userRepository.findOne.mockRejectedValue(error);

      await expect(service.findUserByUsername('testuser')).rejects.toThrow(
        error,
      );
    });
  });

  describe('validateUserCredentials', () => {
    beforeEach(() => {
      userRepository.save.mockResolvedValue(mockUser);
    });

    it('should validate user with email and correct password', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(mockUser) // findUserByEmail
        .mockResolvedValueOnce(null); // findUserByUsername (not called)
      passwordService.validatePassword.mockResolvedValue(true);

      const result = await service.validateUserCredentials(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual(mockUser);
      expect(passwordService.validatePassword).toHaveBeenCalledWith(
        'password123',
        mockUser.password_hash,
      );
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          last_login: expect.any(Date),
        }),
      );
    });

    it('should validate user with username and correct password', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(null) // findUserByEmail
        .mockResolvedValueOnce(mockUser); // findUserByUsername
      passwordService.validatePassword.mockResolvedValue(true);

      const result = await service.validateUserCredentials(
        'testuser',
        'password123',
      );

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should return null for nonexistent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUserCredentials(
        'nonexistent',
        'password123',
      );

      expect(result).toBeNull();
      expect(passwordService.validatePassword).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should return null for incorrect password', async () => {
      userRepository.findOne.mockResolvedValueOnce(mockUser);
      passwordService.validatePassword.mockResolvedValue(false);

      const result = await service.validateUserCredentials(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should handle password validation errors', async () => {
      userRepository.findOne.mockResolvedValueOnce(mockUser);
      const error = new Error('Password validation error');
      passwordService.validatePassword.mockRejectedValue(error);

      await expect(
        service.validateUserCredentials('test@example.com', 'password123'),
      ).rejects.toThrow(error);
    });

    it('should update last_login timestamp on successful validation', async () => {
      const originalLastLogin = mockUser.last_login;
      userRepository.findOne.mockResolvedValueOnce(mockUser);
      passwordService.validatePassword.mockResolvedValue(true);

      const beforeTime = new Date();
      await service.validateUserCredentials('test@example.com', 'password123');
      const afterTime = new Date();

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          last_login: expect.any(Date),
        }),
      );

      const saveCall = userRepository.save.mock.calls[0][0];
      expect(saveCall.last_login.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(saveCall.last_login.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      );
    });
  });

  describe('Password Recovery', () => {
    describe('forgotPassword', () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'user@example.com',
      };

      it('should successfully initiate password reset for existing user', async () => {
        userRepository.findOne.mockResolvedValue(mockUser);
        passwordResetTokenService.generatePasswordResetToken.mockResolvedValue('reset-token-123');
        emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

        await service.forgotPassword(forgotPasswordDto);

        expect(userRepository.findOne).toHaveBeenCalledWith({
          where: { email: forgotPasswordDto.email },
        });
        expect(passwordResetTokenService.generatePasswordResetToken).toHaveBeenCalledWith(mockUser.id);
        expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
          mockUser.email,
          'reset-token-123',
          mockUser.username
        );
      });

      it('should complete silently for non-existent user (security)', async () => {
        userRepository.findOne.mockResolvedValue(null);

        await service.forgotPassword(forgotPasswordDto);

        expect(userRepository.findOne).toHaveBeenCalledWith({
          where: { email: forgotPasswordDto.email },
        });
        expect(passwordResetTokenService.generatePasswordResetToken).not.toHaveBeenCalled();
        expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      });

      it('should handle email service errors gracefully', async () => {
        userRepository.findOne.mockResolvedValue(mockUser);
        passwordResetTokenService.generatePasswordResetToken.mockResolvedValue('reset-token-123');
        emailService.sendPasswordResetEmail.mockRejectedValue(new Error('Email service unavailable'));

        await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(
          'Email service unavailable'
        );

        expect(passwordResetTokenService.generatePasswordResetToken).toHaveBeenCalledWith(mockUser.id);
        expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
          mockUser.email,
          'reset-token-123',
          mockUser.username
        );
      });

      it('should handle token generation errors', async () => {
        userRepository.findOne.mockResolvedValue(mockUser);
        passwordResetTokenService.generatePasswordResetToken.mockRejectedValue(
          new Error('Token generation failed')
        );

        await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(
          'Token generation failed'
        );

        expect(userRepository.findOne).toHaveBeenCalledWith({
          where: { email: forgotPasswordDto.email },
        });
        expect(passwordResetTokenService.generatePasswordResetToken).toHaveBeenCalledWith(mockUser.id);
        expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      });
    });

    describe('resetPassword', () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'valid-reset-token-123',
        newPassword: 'NewSecurePass123!',
      };

      it('should successfully reset password with valid token', async () => {
        passwordResetTokenService.validateAndConsumeToken.mockResolvedValue(mockUser.id);
        userRepository.findOne.mockResolvedValue(mockUser);
        passwordService.hashPassword.mockResolvedValue('new_hashed_password');
        userRepository.save.mockResolvedValue({ ...mockUser, password_hash: 'new_hashed_password' });

        await service.resetPassword(resetPasswordDto);

        expect(passwordResetTokenService.validateAndConsumeToken).toHaveBeenCalledWith(resetPasswordDto.token);
        expect(userRepository.findOne).toHaveBeenCalledWith({
          where: { id: mockUser.id },
        });
        expect(passwordService.hashPassword).toHaveBeenCalledWith(resetPasswordDto.newPassword);
        expect(userRepository.save).toHaveBeenCalledWith({
          ...mockUser,
          password_hash: 'new_hashed_password',
        });
      });

      it('should throw UnauthorizedException for invalid token', async () => {
        passwordResetTokenService.validateAndConsumeToken.mockRejectedValue(
          new UnauthorizedException('Invalid reset token')
        );

        await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
          UnauthorizedException
        );

        expect(passwordResetTokenService.validateAndConsumeToken).toHaveBeenCalledWith(resetPasswordDto.token);
        expect(userRepository.findOne).not.toHaveBeenCalled();
        expect(passwordService.hashPassword).not.toHaveBeenCalled();
      });

      it('should throw UnauthorizedException when user not found', async () => {
        passwordResetTokenService.validateAndConsumeToken.mockResolvedValue(mockUser.id);
        userRepository.findOne.mockResolvedValue(null);

        await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
          UnauthorizedException
        );

        expect(passwordResetTokenService.validateAndConsumeToken).toHaveBeenCalledWith(resetPasswordDto.token);
        expect(userRepository.findOne).toHaveBeenCalledWith({
          where: { id: mockUser.id },
        });
        expect(passwordService.hashPassword).not.toHaveBeenCalled();
      });

      it('should handle password hashing errors', async () => {
        passwordResetTokenService.validateAndConsumeToken.mockResolvedValue(mockUser.id);
        userRepository.findOne.mockResolvedValue(mockUser);
        passwordService.hashPassword.mockRejectedValue(new Error('Hashing failed'));

        await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
          'Hashing failed'
        );

        expect(passwordService.hashPassword).toHaveBeenCalledWith(resetPasswordDto.newPassword);
        expect(userRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
