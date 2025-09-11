import { PasswordResetToken } from './password-reset-token.entity';

describe('PasswordResetToken Entity', () => {
  let passwordResetToken: PasswordResetToken;

  beforeEach(() => {
    passwordResetToken = new PasswordResetToken();
    passwordResetToken.id = 'test-id';
    passwordResetToken.userId = 'user-id';
    passwordResetToken.tokenHash = 'hashed-token';
    passwordResetToken.createdAt = new Date();
    passwordResetToken.usedAt = null;
  });

  describe('isExpired', () => {
    it('should return true when token is expired', () => {
      // Set expiration to 1 hour ago
      passwordResetToken.expiresAt = new Date(Date.now() - 60 * 60 * 1000);
      
      expect(passwordResetToken.isExpired()).toBe(true);
    });

    it('should return false when token is not expired', () => {
      // Set expiration to 1 hour in the future
      passwordResetToken.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      expect(passwordResetToken.isExpired()).toBe(false);
    });

    it('should handle edge case when expiresAt equals current time', () => {
      const now = new Date();
      passwordResetToken.expiresAt = new Date(now.getTime());
      
      // Mock Date.now to be slightly after expiresAt
      jest.spyOn(Date.prototype, 'getTime').mockReturnValue(now.getTime() + 1);
      
      expect(passwordResetToken.isExpired()).toBe(true);
      
      jest.restoreAllMocks();
    });
  });

  describe('isUsed', () => {
    it('should return true when token has been used', () => {
      passwordResetToken.usedAt = new Date();
      
      expect(passwordResetToken.isUsed()).toBe(true);
    });

    it('should return false when token has not been used', () => {
      passwordResetToken.usedAt = null;
      
      expect(passwordResetToken.isUsed()).toBe(false);
    });
  });

  describe('isValid', () => {
    it('should return true when token is not expired and not used', () => {
      passwordResetToken.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Future
      passwordResetToken.usedAt = null;
      
      expect(passwordResetToken.isValid()).toBe(true);
    });

    it('should return false when token is expired', () => {
      passwordResetToken.expiresAt = new Date(Date.now() - 60 * 60 * 1000); // Past
      passwordResetToken.usedAt = null;
      
      expect(passwordResetToken.isValid()).toBe(false);
    });

    it('should return false when token is used', () => {
      passwordResetToken.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Future
      passwordResetToken.usedAt = new Date();
      
      expect(passwordResetToken.isValid()).toBe(false);
    });

    it('should return false when token is both expired and used', () => {
      passwordResetToken.expiresAt = new Date(Date.now() - 60 * 60 * 1000); // Past
      passwordResetToken.usedAt = new Date();
      
      expect(passwordResetToken.isValid()).toBe(false);
    });
  });

  describe('markAsUsed', () => {
    it('should set usedAt to current time', () => {
      const beforeMark = new Date();
      
      passwordResetToken.markAsUsed();
      
      const afterMark = new Date();
      
      expect(passwordResetToken.usedAt).toBeInstanceOf(Date);
      expect(passwordResetToken.usedAt!.getTime()).toBeGreaterThanOrEqual(beforeMark.getTime());
      expect(passwordResetToken.usedAt!.getTime()).toBeLessThanOrEqual(afterMark.getTime());
    });

    it('should make isUsed return true after marking as used', () => {
      expect(passwordResetToken.isUsed()).toBe(false);
      
      passwordResetToken.markAsUsed();
      
      expect(passwordResetToken.isUsed()).toBe(true);
    });

    it('should make isValid return false after marking as used', () => {
      passwordResetToken.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Future
      expect(passwordResetToken.isValid()).toBe(true);
      
      passwordResetToken.markAsUsed();
      
      expect(passwordResetToken.isValid()).toBe(false);
    });
  });

  describe('Entity Properties', () => {
    it('should have all required properties', () => {
      expect(passwordResetToken).toHaveProperty('id');
      expect(passwordResetToken).toHaveProperty('userId');
      expect(passwordResetToken).toHaveProperty('tokenHash');
      expect(passwordResetToken).toHaveProperty('expiresAt');
      expect(passwordResetToken).toHaveProperty('usedAt');
      expect(passwordResetToken).toHaveProperty('createdAt');
    });

    it('should allow null for usedAt property', () => {
      passwordResetToken.usedAt = null;
      expect(passwordResetToken.usedAt).toBeNull();
    });
  });
});