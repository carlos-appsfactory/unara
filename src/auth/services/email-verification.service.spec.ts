import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { User } from '../../users/entities/user.entity';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let userRepository: jest.Mocked<Repository<User>>;

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

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateVerificationToken', () => {
    it('should generate and store verification token', async () => {
      const userId = mockUser.id;
      userRepository.update.mockResolvedValue({ affected: 1 } as UpdateResult);

      const token = await service.generateVerificationToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      ); // UUID format

      expect(userRepository.update).toHaveBeenCalledWith(userId, {
        email_verification_token: token,
        email_verification_expires_at: expect.any(Date),
      });
    });

    it('should set token expiration to 24 hours from now', async () => {
      const userId = mockUser.id;
      userRepository.update.mockResolvedValue({ affected: 1 } as UpdateResult);

      const beforeGeneration = new Date();
      await service.generateVerificationToken(userId);
      const afterGeneration = new Date();

      const updateCall = userRepository.update.mock.calls[0][1] as any;
      const expirationDate = updateCall.email_verification_expires_at;

      // Check that expiration is approximately 24 hours from now
      const expectedExpiration = new Date(
        beforeGeneration.getTime() + 24 * 60 * 60 * 1000,
      );
      const timeDifference = Math.abs(
        expirationDate.getTime() - expectedExpiration.getTime(),
      );

      expect(timeDifference).toBeLessThan(1000); // Within 1 second tolerance
    });

    it('should handle database errors', async () => {
      const userId = mockUser.id;
      const error = new Error('Database error');
      userRepository.update.mockRejectedValue(error);

      await expect(service.generateVerificationToken(userId)).rejects.toThrow(
        error,
      );
    });
  });

  describe('verifyEmailToken', () => {
    it('should verify valid token and mark email as verified', async () => {
      const token = 'valid-token-uuid';
      const userWithToken = {
        ...mockUser,
        email_verification_token: token,
        email_verification_expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ), // 24 hours from now
      };
      const verifiedUser = { ...userWithToken, email_verified: true };

      userRepository.findOne
        .mockResolvedValueOnce(userWithToken) // First call to find user by token
        .mockResolvedValueOnce(verifiedUser); // Second call to get updated user
      userRepository.update.mockResolvedValue({ affected: 1 } as UpdateResult);

      const result = await service.verifyEmailToken(token);

      expect(result).toEqual(verifiedUser);
      expect(userRepository.update).toHaveBeenCalledWith(userWithToken.id, {
        email_verified: true,
        email_verification_token: null,
        email_verification_expires_at: null,
      });
    });

    it('should return null for invalid token', async () => {
      const token = 'invalid-token';
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.verifyEmailToken(token);

      expect(result).toBeNull();
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should return null for expired token and clear it', async () => {
      const token = 'expired-token-uuid';
      const userWithExpiredToken = {
        ...mockUser,
        email_verification_token: token,
        email_verification_expires_at: new Date(Date.now() - 1000), // 1 second ago (expired)
      };

      userRepository.findOne.mockResolvedValue(userWithExpiredToken);
      userRepository.update.mockResolvedValue({ affected: 1 } as UpdateResult);

      const result = await service.verifyEmailToken(token);

      expect(result).toBeNull();
      expect(userRepository.update).toHaveBeenCalledWith(
        userWithExpiredToken.id,
        {
          email_verification_token: null,
          email_verification_expires_at: null,
        },
      );
    });

    it('should handle already verified email', async () => {
      const token = 'valid-token-uuid';
      const alreadyVerifiedUser = {
        ...mockUser,
        email_verified: true,
        email_verification_token: token,
        email_verification_expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ),
      };

      userRepository.findOne.mockResolvedValue(alreadyVerifiedUser);
      userRepository.update.mockResolvedValue({ affected: 1 } as UpdateResult);

      const result = await service.verifyEmailToken(token);

      expect(result).toEqual(alreadyVerifiedUser);
      expect(userRepository.update).toHaveBeenCalledWith(
        alreadyVerifiedUser.id,
        {
          email_verification_token: null,
          email_verification_expires_at: null,
        },
      );
    });

    it('should throw BadRequestException for empty token', async () => {
      await expect(service.verifyEmailToken('')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyEmailToken('')).rejects.toThrow(
        'Verification token is required',
      );
    });

    it('should handle database errors', async () => {
      const token = 'valid-token';
      const error = new Error('Database error');
      userRepository.findOne.mockRejectedValue(error);

      await expect(service.verifyEmailToken(token)).rejects.toThrow(error);
    });
  });

  describe('resendVerificationToken', () => {
    it('should generate new token for unverified user', async () => {
      const email = 'test@example.com';
      const unverifiedUser = { ...mockUser, email_verified: false };

      userRepository.findOne.mockResolvedValue(unverifiedUser);
      userRepository.update.mockResolvedValue({ affected: 1 } as UpdateResult);

      const token = await service.resendVerificationToken(email);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(userRepository.update).toHaveBeenCalledWith(unverifiedUser.id, {
        email_verification_token: token,
        email_verification_expires_at: expect.any(Date),
      });
    });

    it('should throw NotFoundException for non-existent email', async () => {
      const email = 'nonexistent@example.com';
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.resendVerificationToken(email)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.resendVerificationToken(email)).rejects.toThrow(
        'If this email is registered, a verification email will be sent',
      );
    });

    it('should throw BadRequestException for already verified email', async () => {
      const email = 'verified@example.com';
      const verifiedUser = { ...mockUser, email_verified: true };

      userRepository.findOne.mockResolvedValue(verifiedUser);

      await expect(service.resendVerificationToken(email)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resendVerificationToken(email)).rejects.toThrow(
        'Email is already verified',
      );
    });

    it('should throw BadRequestException for empty email', async () => {
      await expect(service.resendVerificationToken('')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resendVerificationToken('')).rejects.toThrow(
        'Email is required',
      );
    });
  });

  describe('clearExpiredTokens', () => {
    it('should clear expired tokens and return count', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const clearedCount = await service.clearExpiredTokens();

      expect(clearedCount).toBe(3);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(User);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        email_verification_token: null,
        email_verification_expires_at: null,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'email_verification_expires_at < :now',
        { now: expect.any(Date) },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'email_verification_token IS NOT NULL',
      );
    });

    it('should handle no expired tokens', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const clearedCount = await service.clearExpiredTokens();

      expect(clearedCount).toBe(0);
    });

    it('should handle undefined affected count', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: undefined }),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const clearedCount = await service.clearExpiredTokens();

      expect(clearedCount).toBe(0);
    });
  });

  describe('hasValidVerificationToken', () => {
    it('should return true for valid unexpired token', async () => {
      const userId = mockUser.id;
      const userWithValidToken = {
        email_verification_token: 'valid-token',
        email_verification_expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ),
      };

      userRepository.findOne.mockResolvedValue(userWithValidToken as User);

      const result = await service.hasValidVerificationToken(userId);

      expect(result).toBe(true);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        select: ['email_verification_token', 'email_verification_expires_at'],
      });
    });

    it('should return false for expired token', async () => {
      const userId = mockUser.id;
      const userWithExpiredToken = {
        email_verification_token: 'expired-token',
        email_verification_expires_at: new Date(Date.now() - 1000), // Expired
      };

      userRepository.findOne.mockResolvedValue(userWithExpiredToken as User);

      const result = await service.hasValidVerificationToken(userId);

      expect(result).toBe(false);
    });

    it('should return false for user without token', async () => {
      const userId = mockUser.id;
      const userWithoutToken = {
        email_verification_token: null,
        email_verification_expires_at: null,
      };

      userRepository.findOne.mockResolvedValue(userWithoutToken as User);

      const result = await service.hasValidVerificationToken(userId);

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const userId = 'non-existent-id';
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.hasValidVerificationToken(userId);

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      const userId = mockUser.id;
      const error = new Error('Database error');
      userRepository.findOne.mockRejectedValue(error);

      const result = await service.hasValidVerificationToken(userId);

      expect(result).toBe(false);
    });
  });
});
