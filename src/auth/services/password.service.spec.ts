import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { PasswordService } from './password.service';
import * as bcrypt from 'bcrypt';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const plainPassword = 'testPassword123!';
      const hashedPassword = await service.hashPassword(plainPassword);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 characters
    });

    it('should generate different hashes for the same password', async () => {
      const plainPassword = 'testPassword123!';
      const hash1 = await service.hashPassword(plainPassword);
      const hash2 = await service.hashPassword(plainPassword);

      expect(hash1).not.toBe(hash2); // Different salts should produce different hashes
    });

    it('should throw error for empty password', async () => {
      await expect(service.hashPassword('')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw error for null password', async () => {
      await expect(service.hashPassword(null as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw error for undefined password', async () => {
      await expect(service.hashPassword(undefined as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password successfully', async () => {
      const plainPassword = 'testPassword123!';
      const hashedPassword = await service.hashPassword(plainPassword);

      const isValid = await service.validatePassword(
        plainPassword,
        hashedPassword,
      );
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const plainPassword = 'testPassword123!';
      const wrongPassword = 'wrongPassword456!';
      const hashedPassword = await service.hashPassword(plainPassword);

      const isValid = await service.validatePassword(
        wrongPassword,
        hashedPassword,
      );
      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hashedPassword = await service.hashPassword('validPassword123!');
      const isValid = await service.validatePassword('', hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await service.validatePassword('validPassword123!', '');
      expect(isValid).toBe(false);
    });

    it('should return false for null inputs', async () => {
      const isValid1 = await service.validatePassword(null as any, 'someHash');
      const isValid2 = await service.validatePassword('password', null as any);
      const isValid3 = await service.validatePassword(null as any, null as any);

      expect(isValid1).toBe(false);
      expect(isValid2).toBe(false);
      expect(isValid3).toBe(false);
    });

    it('should handle invalid hash format gracefully', async () => {
      const isValid = await service.validatePassword(
        'password123',
        'invalidHashFormat',
      );
      expect(isValid).toBe(false);
    });
  });

  describe('Security Tests', () => {
    it('should use salt rounds of 12 or higher', async () => {
      const plainPassword = 'testPassword123!';
      const hashedPassword = await service.hashPassword(plainPassword);

      // bcrypt hash format: $2b$rounds$salt(22chars)hash(31chars)
      const rounds = hashedPassword.split('$')[2];
      expect(parseInt(rounds)).toBeGreaterThanOrEqual(12);
    });

    it('should generate unique salts for each hash', async () => {
      const plainPassword = 'testPassword123!';
      const hash1 = await service.hashPassword(plainPassword);
      const hash2 = await service.hashPassword(plainPassword);

      // Extract salt from bcrypt hash (first 29 characters after $2b$12$)
      const salt1 = hash1.substring(0, 29);
      const salt2 = hash2.substring(0, 29);

      expect(salt1).not.toBe(salt2);
    });

    it('should handle special characters in passwords', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedPassword = await service.hashPassword(specialPassword);
      const isValid = await service.validatePassword(
        specialPassword,
        hashedPassword,
      );

      expect(hashedPassword).toBeDefined();
      expect(isValid).toBe(true);
    });

    it('should handle unicode characters in passwords', async () => {
      const unicodePassword = '测试密码123!';
      const hashedPassword = await service.hashPassword(unicodePassword);
      const isValid = await service.validatePassword(
        unicodePassword,
        hashedPassword,
      );

      expect(hashedPassword).toBeDefined();
      expect(isValid).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should hash password in reasonable time', async () => {
      const plainPassword = 'testPassword123!';
      const startTime = Date.now();

      await service.hashPassword(plainPassword);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should validate password in reasonable time', async () => {
      const plainPassword = 'testPassword123!';
      const hashedPassword = await service.hashPassword(plainPassword);

      const startTime = Date.now();
      await service.validatePassword(plainPassword, hashedPassword);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Validation should be faster than hashing
    });
  });
});
