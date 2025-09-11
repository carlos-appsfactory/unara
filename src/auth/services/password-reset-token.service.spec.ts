import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PasswordResetTokenService } from './password-reset-token.service';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { User } from '../../users/entities/user.entity';
import * as crypto from 'crypto';

describe('PasswordResetTokenService', () => {
  let service: PasswordResetTokenService;
  let passwordResetTokenRepository: jest.Mocked<Repository<PasswordResetToken>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
  } as User;

  const mockPasswordResetToken = {
    id: 'token-123',
    userId: 'user-123',
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    usedAt: null,
    createdAt: new Date(),
    user: mockUser,
    isExpired: jest.fn().mockReturnValue(false),
    isUsed: jest.fn().mockReturnValue(false),
    isValid: jest.fn().mockReturnValue(true),
    markAsUsed: jest.fn(),
  } as unknown as PasswordResetToken;

  beforeEach(async () => {
    const mockPasswordResetTokenRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      })),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetTokenService,
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: mockPasswordResetTokenRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<PasswordResetTokenService>(PasswordResetTokenService);
    passwordResetTokenRepository = module.get(getRepositoryToken(PasswordResetToken));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePasswordResetToken', () => {
    it('should generate a token for valid user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      passwordResetTokenRepository.create.mockReturnValue(mockPasswordResetToken);
      passwordResetTokenRepository.save.mockResolvedValue(mockPasswordResetToken);
      
      const queryBuilder = passwordResetTokenRepository.createQueryBuilder();
      queryBuilder.execute.mockResolvedValue({ affected: 1 });

      const token = await service.generatePasswordResetToken('user-123');

      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes * 2 (hex encoding)
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: ['id', 'email'],
      });
      expect(passwordResetTokenRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
        usedAt: null,
      });
      expect(passwordResetTokenRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.generatePasswordResetToken('invalid-user')).rejects.toThrow(
        NotFoundException,
      );
      expect(passwordResetTokenRepository.create).not.toHaveBeenCalled();
    });

    it('should invalidate existing tokens before creating new one', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      passwordResetTokenRepository.create.mockReturnValue(mockPasswordResetToken);
      passwordResetTokenRepository.save.mockResolvedValue(mockPasswordResetToken);
      
      // Mock the query builder more specifically for this test
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      passwordResetTokenRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.generatePasswordResetToken('user-123');

      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ usedAt: expect.any(Date) });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('userId = :userId', { userId: 'user-123' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('usedAt IS NULL');
    });

    it('should handle database errors gracefully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      passwordResetTokenRepository.create.mockReturnValue(mockPasswordResetToken);
      passwordResetTokenRepository.save.mockRejectedValue(new Error('Database error'));
      
      const queryBuilder = passwordResetTokenRepository.createQueryBuilder();
      queryBuilder.execute.mockResolvedValue({ affected: 0 });

      await expect(service.generatePasswordResetToken('user-123')).rejects.toThrow('Database error');
    });
  });

  describe('validatePasswordResetToken', () => {
    it('should return user for valid token', async () => {
      const validToken = mockPasswordResetToken;
      validToken.isValid = jest.fn().mockReturnValue(true);
      passwordResetTokenRepository.findOne.mockResolvedValue(validToken);

      const result = await service.validatePasswordResetToken('valid-token');

      expect(result).toBe(mockUser);
      expect(passwordResetTokenRepository.findOne).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
        relations: ['user'],
      });
    });

    it('should return null for invalid token', async () => {
      passwordResetTokenRepository.findOne.mockResolvedValue(null);

      const result = await service.validatePasswordResetToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      const expiredToken = { ...mockPasswordResetToken };
      expiredToken.isValid = jest.fn().mockReturnValue(false);
      expiredToken.isExpired = jest.fn().mockReturnValue(true);
      expiredToken.isUsed = jest.fn().mockReturnValue(false);
      passwordResetTokenRepository.findOne.mockResolvedValue(expiredToken);

      const result = await service.validatePasswordResetToken('expired-token');

      expect(result).toBeNull();
    });

    it('should return null for used token', async () => {
      const usedToken = { ...mockPasswordResetToken };
      usedToken.isValid = jest.fn().mockReturnValue(false);
      usedToken.isExpired = jest.fn().mockReturnValue(false);
      usedToken.isUsed = jest.fn().mockReturnValue(true);
      passwordResetTokenRepository.findOne.mockResolvedValue(usedToken);

      const result = await service.validatePasswordResetToken('used-token');

      expect(result).toBeNull();
    });

    it('should throw BadRequestException for empty token', async () => {
      await expect(service.validatePasswordResetToken('')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validatePasswordResetToken('   ')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markTokenAsUsed', () => {
    it('should mark valid token as used', async () => {
      const tokenToMark = { ...mockPasswordResetToken };
      passwordResetTokenRepository.findOne.mockResolvedValue(tokenToMark);
      passwordResetTokenRepository.save.mockResolvedValue(tokenToMark);

      await service.markTokenAsUsed('valid-token');

      expect(tokenToMark.markAsUsed).toHaveBeenCalled();
      expect(passwordResetTokenRepository.save).toHaveBeenCalledWith(tokenToMark);
    });

    it('should throw NotFoundException for non-existent token', async () => {
      passwordResetTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.markTokenAsUsed('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('invalidateExistingTokens', () => {
    it('should invalidate unused tokens for user', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      passwordResetTokenRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.invalidateExistingTokens('user-123');

      expect(result).toBe(3);
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ usedAt: expect.any(Date) });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('userId = :userId', { userId: 'user-123' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('usedAt IS NULL');
    });

    it('should return 0 when no tokens to invalidate', async () => {
      const queryBuilder = passwordResetTokenRepository.createQueryBuilder();
      queryBuilder.execute.mockResolvedValue({ affected: 0 });

      const result = await service.invalidateExistingTokens('user-123');

      expect(result).toBe(0);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      passwordResetTokenRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(PasswordResetToken);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('expiresAt < :now', { now: expect.any(Date) });
    });

    it('should return 0 when no expired tokens', async () => {
      const queryBuilder = passwordResetTokenRepository.createQueryBuilder();
      queryBuilder.execute.mockResolvedValue({ affected: 0 });

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(0);
    });
  });

  describe('getValidTokenCountForUser', () => {
    it('should return count of valid tokens for user', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      };
      passwordResetTokenRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getValidTokenCountForUser('user-123');

      expect(result).toBe(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('userId = :userId', { userId: 'user-123' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('usedAt IS NULL');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('expiresAt > :now', { now: expect.any(Date) });
    });

    it('should return 0 on database error', async () => {
      const queryBuilder = passwordResetTokenRepository.createQueryBuilder();
      queryBuilder.getCount.mockRejectedValue(new Error('Database error'));

      const result = await service.getValidTokenCountForUser('user-123');

      expect(result).toBe(0);
    });
  });

  describe('Token Hashing', () => {
    it('should generate secure tokens and hash them properly', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      passwordResetTokenRepository.create.mockReturnValue(mockPasswordResetToken);
      passwordResetTokenRepository.save.mockResolvedValue(mockPasswordResetToken);
      
      const queryBuilder = passwordResetTokenRepository.createQueryBuilder();
      queryBuilder.execute.mockResolvedValue({ affected: 0 });

      const token = await service.generatePasswordResetToken('user-123');
      
      // Verify the create call received a hashed version of the token
      expect(passwordResetTokenRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
        usedAt: null,
      });

      const createCall = passwordResetTokenRepository.create.mock.calls[0][0];
      expect(createCall.tokenHash).not.toBe(token); // Hash should be different from plain token
      expect(createCall.tokenHash.length).toBe(64); // SHA256 hash is 64 chars in hex
      expect(token.length).toBe(64); // Plain token is 32 bytes in hex = 64 chars
    });
  });

  describe('Token Expiration', () => {
    it('should set expiration to 15 minutes from creation', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      passwordResetTokenRepository.create.mockReturnValue(mockPasswordResetToken);
      passwordResetTokenRepository.save.mockResolvedValue(mockPasswordResetToken);
      
      const queryBuilder = passwordResetTokenRepository.createQueryBuilder();
      queryBuilder.execute.mockResolvedValue({ affected: 0 });

      const beforeGeneration = new Date();
      await service.generatePasswordResetToken('user-123');
      const afterGeneration = new Date();

      const createCall = passwordResetTokenRepository.create.mock.calls[0][0];
      const expectedMinExpiry = new Date(beforeGeneration.getTime() + 15 * 60 * 1000);
      const expectedMaxExpiry = new Date(afterGeneration.getTime() + 15 * 60 * 1000);

      expect(createCall.expiresAt).toBeInstanceOf(Date);
      expect(createCall.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry.getTime());
      expect(createCall.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry.getTime());
    });
  });
});