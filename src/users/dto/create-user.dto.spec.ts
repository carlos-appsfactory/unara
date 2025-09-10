import { validate, useContainer } from 'class-validator';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateUserDto } from './create-user.dto';
import { User } from '../entities/user.entity';
import { IsEmailUniqueConstraint } from '../../auth/validators/is-email-unique.validator';
import { IsUsernameUniqueConstraint } from '../../auth/validators/is-username-unique.validator';

describe('CreateUserDto', () => {
  let dto: CreateUserDto;
  let mockUserRepository: any;
  let module: TestingModule;

  beforeAll(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        IsEmailUniqueConstraint,
        IsUsernameUniqueConstraint,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    // Set up class-validator to use NestJS container for dependency injection
    useContainer(module, { fallbackOnErrors: true });
  });

  beforeEach(() => {
    dto = new CreateUserDto();
    dto.email = 'john@example.com';
    dto.username = 'johndoe';
    dto.password = 'StrongPass123!';

    // Default mock: no existing users found (unique validation passes)
    mockUserRepository.findOne.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Valid DTO', () => {
    it('should pass validation with all valid fields', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should call repository to check email uniqueness', async () => {
      await validate(dto);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
    });

    it('should call repository to check username uniqueness', async () => {
      await validate(dto);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'johndoe' },
      });
    });
  });

  describe('Email Validation', () => {
    it('should reject invalid email format', async () => {
      dto.email = 'invalid-email';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should reject empty email', async () => {
      dto.email = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should reject email longer than 255 characters', async () => {
      dto.email = 'a'.repeat(250) + '@example.com'; // 261 characters
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should accept various valid email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
      ];

      for (const email of validEmails) {
        dto.email = email;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject duplicate email', async () => {
      mockUserRepository.findOne.mockImplementation(({ where }) => {
        if (where.email === 'john@example.com') {
          return Promise.resolve({ id: '1', email: 'john@example.com' });
        }
        return Promise.resolve(null);
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some(
          (e) => e.property === 'email' && e.constraints?.isEmailUnique,
        ),
      ).toBe(true);
    });
  });

  describe('Username Validation', () => {
    it('should reject empty username', async () => {
      dto.username = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'username')).toBe(true);
    });

    it('should reject username shorter than 3 characters', async () => {
      dto.username = 'ab';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'username')).toBe(true);
    });

    it('should reject username longer than 30 characters', async () => {
      dto.username = 'a'.repeat(31);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'username')).toBe(true);
    });

    it('should accept username exactly 3 characters', async () => {
      dto.username = 'abc';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept username exactly 30 characters', async () => {
      dto.username = 'a'.repeat(30);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept usernames with valid characters', async () => {
      const validUsernames = [
        'user123',
        'test_user',
        'User_Name_123',
        'abc',
        'a'.repeat(30),
      ];

      for (const username of validUsernames) {
        dto.username = username;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject usernames with invalid characters', async () => {
      const invalidUsernames = [
        'user-name', // hyphen not allowed
        'user.name', // dot not allowed
        'user name', // space not allowed
        'user@name', // @ not allowed
        'user#name', // # not allowed
        'user!name', // ! not allowed
      ];

      for (const username of invalidUsernames) {
        dto.username = username;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((e) => e.property === 'username')).toBe(true);
      }
    });

    it('should reject duplicate username', async () => {
      mockUserRepository.findOne.mockImplementation(({ where }) => {
        if (where.username === 'johndoe') {
          return Promise.resolve({ id: '1', username: 'johndoe' });
        }
        return Promise.resolve(null);
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some(
          (e) => e.property === 'username' && e.constraints?.isUsernameUnique,
        ),
      ).toBe(true);
    });
  });

  describe('Password Validation (Strong Password)', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'short', // too short
        'nouppercase1!', // no uppercase
        'NOLOWERCASE1!', // no lowercase
        'NoNumbers!', // no numbers
        'NoSpecialChar1', // no special characters
        '12345678', // only numbers
        'abcdefgh', // only lowercase
      ];

      for (const password of weakPasswords) {
        dto.password = password;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((e) => e.property === 'password')).toBe(true);
      }
    });

    it('should accept strong passwords', async () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecure@Pass1',
        'Complex$Password2024',
        'Valid#Password99',
      ];

      for (const password of strongPasswords) {
        dto.password = password;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should provide detailed error message for weak password', async () => {
      dto.password = 'weak';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.isStrongPassword).toContain(
        'at least 8 characters',
      );
    });

    it('should reject empty password', async () => {
      dto.password = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });
  });

  describe('Multiple Field Validation', () => {
    it('should report multiple validation errors', async () => {
      dto.email = 'invalid-email';
      dto.username = 'a'; // too short
      dto.password = 'weak'; // weak password

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
      expect(errors.some((e) => e.property === 'username')).toBe(true);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should pass validation with minimal valid data', async () => {
      dto.email = 'test@example.com';
      dto.username = 'testuser';
      dto.password = 'StrongPass123!';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
