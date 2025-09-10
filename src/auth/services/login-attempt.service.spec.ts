import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { LoginAttemptService } from './login-attempt.service';
import { LoginAttempt } from '../entities/login-attempt.entity';

describe('LoginAttemptService', () => {
  let service: LoginAttemptService;
  let repository: jest.Mocked<Repository<LoginAttempt>>;

  const mockLoginAttempt: LoginAttempt = {
    id: 'attempt-123',
    identifier: 'test@example.com',
    ip_address: '192.168.1.1',
    attempt_count: 1,
    blocked_until: null,
    last_attempt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawOne: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginAttemptService,
        {
          provide: getRepositoryToken(LoginAttempt),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<LoginAttemptService>(LoginAttemptService);
    repository = module.get(getRepositoryToken(LoginAttempt));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordFailedAttempt', () => {
    it('should create new login attempt record for first failure', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockLoginAttempt);
      repository.save.mockResolvedValue(mockLoginAttempt);

      await service.recordFailedAttempt('test@example.com', '192.168.1.1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { identifier: 'test@example.com', ip_address: '192.168.1.1' },
      });
      expect(repository.create).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        ip_address: '192.168.1.1',
        attempt_count: 1,
        last_attempt: expect.any(Date),
        blocked_until: null,
      });
      expect(repository.save).toHaveBeenCalledWith(mockLoginAttempt);
    });

    it('should increment attempt count for existing record', async () => {
      const existingAttempt = {
        ...mockLoginAttempt,
        attempt_count: 2,
        blocked_until: null,
      };

      repository.findOne.mockResolvedValue(existingAttempt);
      repository.save.mockResolvedValue(existingAttempt);

      await service.recordFailedAttempt('test@example.com', '192.168.1.1');

      expect(existingAttempt.attempt_count).toBe(3);
      expect(existingAttempt.blocked_until).toBeNull();
      expect(repository.save).toHaveBeenCalledWith(existingAttempt);
    });

    it('should block account after 5 failed attempts', async () => {
      const existingAttempt = {
        ...mockLoginAttempt,
        attempt_count: 4,
        blocked_until: null,
      };

      repository.findOne.mockResolvedValue(existingAttempt);
      repository.save.mockResolvedValue(existingAttempt);

      await service.recordFailedAttempt('test@example.com', '192.168.1.1');

      expect(existingAttempt.attempt_count).toBe(5);
      expect(existingAttempt.blocked_until).toBeInstanceOf(Date);
      expect(existingAttempt.blocked_until.getTime()).toBeGreaterThan(
        Date.now(),
      );
    });

    it('should extend block time for already blocked account', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);

      const blockedAttempt = {
        ...mockLoginAttempt,
        attempt_count: 5,
        blocked_until: futureDate,
      };

      repository.findOne.mockResolvedValue(blockedAttempt);
      repository.save.mockResolvedValue(blockedAttempt);

      await service.recordFailedAttempt('test@example.com', '192.168.1.1');

      expect(blockedAttempt.attempt_count).toBe(6);
      expect(blockedAttempt.blocked_until.getTime()).toBeGreaterThan(
        futureDate.getTime(),
      );
    });

    it('should handle repository errors gracefully', async () => {
      repository.findOne.mockRejectedValue(new Error('Database error'));

      // Should not throw error
      await expect(
        service.recordFailedAttempt('test@example.com', '192.168.1.1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('isAccountLocked', () => {
    it('should return not locked for non-existent attempt record', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.isAccountLocked(
        'test@example.com',
        '192.168.1.1',
      );

      expect(result).toEqual({ isLocked: false });
    });

    it('should return not locked for non-blocked account', async () => {
      repository.findOne.mockResolvedValue({
        ...mockLoginAttempt,
        attempt_count: 3,
        blocked_until: null,
      });

      const result = await service.isAccountLocked(
        'test@example.com',
        '192.168.1.1',
      );

      expect(result).toEqual({
        isLocked: false,
        attemptCount: 3,
      });
    });

    it('should return locked status for blocked account', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);

      repository.findOne.mockResolvedValue({
        ...mockLoginAttempt,
        attempt_count: 5,
        blocked_until: futureDate,
      });

      const result = await service.isAccountLocked(
        'test@example.com',
        '192.168.1.1',
      );

      expect(result.isLocked).toBe(true);
      expect(result.attemptCount).toBe(5);
      expect(result.remainingLockTimeMinutes).toBeGreaterThan(0);
    });

    it('should return not locked for expired block', async () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 10);

      repository.findOne.mockResolvedValue({
        ...mockLoginAttempt,
        attempt_count: 5,
        blocked_until: pastDate,
      });

      const result = await service.isAccountLocked(
        'test@example.com',
        '192.168.1.1',
      );

      expect(result).toEqual({
        isLocked: false,
        attemptCount: 5,
      });
    });

    it('should handle repository errors gracefully', async () => {
      repository.findOne.mockRejectedValue(new Error('Database error'));

      const result = await service.isAccountLocked(
        'test@example.com',
        '192.168.1.1',
      );

      expect(result).toEqual({ isLocked: false });
    });
  });

  describe('clearSuccessfulAttempt', () => {
    it('should delete login attempt record on successful login', async () => {
      repository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.clearSuccessfulAttempt('test@example.com', '192.168.1.1');

      expect(repository.delete).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        ip_address: '192.168.1.1',
      });
    });

    it('should handle case where no records exist to delete', async () => {
      repository.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(
        service.clearSuccessfulAttempt('test@example.com', '192.168.1.1'),
      ).resolves.toBeUndefined();

      expect(repository.delete).toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      repository.delete.mockRejectedValue(new Error('Database error'));

      await expect(
        service.clearSuccessfulAttempt('test@example.com', '192.168.1.1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getAttemptCount', () => {
    it('should return attempt count for existing record', async () => {
      repository.findOne.mockResolvedValue({
        ...mockLoginAttempt,
        attempt_count: 3,
      });

      const count = await service.getAttemptCount(
        'test@example.com',
        '192.168.1.1',
      );

      expect(count).toBe(3);
    });

    it('should return 0 for non-existent record', async () => {
      repository.findOne.mockResolvedValue(null);

      const count = await service.getAttemptCount(
        'test@example.com',
        '192.168.1.1',
      );

      expect(count).toBe(0);
    });

    it('should handle repository errors gracefully', async () => {
      repository.findOne.mockRejectedValue(new Error('Database error'));

      const count = await service.getAttemptCount(
        'test@example.com',
        '192.168.1.1',
      );

      expect(count).toBe(0);
    });
  });

  describe('cleanupOldAttempts', () => {
    it('should delete old unblocked attempts', async () => {
      repository.delete.mockResolvedValue({ affected: 5, raw: {} });

      await service.cleanupOldAttempts();

      expect(repository.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          last_attempt: expect.objectContaining({
            _type: 'lessThan',
            _value: expect.any(Date),
          }),
          blocked_until: null,
        }),
      );
    });

    it('should handle cleanup with no records to delete', async () => {
      repository.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.cleanupOldAttempts()).resolves.toBeUndefined();
    });

    it('should handle repository errors gracefully', async () => {
      repository.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.cleanupOldAttempts()).resolves.toBeUndefined();
    });
  });

  describe('getStatistics', () => {
    it('should return login attempt statistics', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(100),
        getRawOne: jest.fn().mockResolvedValue({ avg: '2.5' }),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const stats = await service.getStatistics();

      expect(stats).toEqual({
        totalAttempts: 100,
        blockedAccounts: 100,
        averageAttemptsPerAccount: 2.5,
      });
    });

    it('should return statistics for specific identifier', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
        getRawOne: jest.fn().mockResolvedValue({ avg: '3.0' }),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const stats = await service.getStatistics('test@example.com');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'la.identifier = :identifier',
        { identifier: 'test@example.com' },
      );
      expect(stats).toEqual({
        totalAttempts: 10,
        blockedAccounts: 10,
        averageAttemptsPerAccount: 3.0,
      });
    });

    it('should handle repository errors gracefully', async () => {
      repository.createQueryBuilder.mockImplementation(() => {
        throw new Error('Database error');
      });

      const stats = await service.getStatistics();

      expect(stats).toEqual({
        totalAttempts: 0,
        blockedAccounts: 0,
        averageAttemptsPerAccount: 0,
      });
    });
  });
});
