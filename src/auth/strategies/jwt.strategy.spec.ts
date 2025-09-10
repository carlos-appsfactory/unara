import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthService } from '../services/jwt-auth.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockConfigService: Partial<ConfigService>;
  let mockJwtAuthService: Partial<JwtAuthService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test-secret';
        return undefined;
      }),
    };

    mockJwtAuthService = {
      validateToken: jest.fn(),
    };

    strategy = new JwtStrategy(
      mockConfigService as ConfigService,
      mockJwtAuthService as JwtAuthService,
    );
  });

  describe('validate', () => {
    const validPayload: JwtPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    it('should return user payload when validation succeeds', async () => {
      (mockJwtAuthService.validateToken as jest.Mock).mockResolvedValue(true);

      const result = await strategy.validate(validPayload);

      expect(result).toEqual({
        sub: validPayload.sub,
        email: validPayload.email,
        username: validPayload.username,
        iat: validPayload.iat,
        exp: validPayload.exp,
      });
      expect(mockJwtAuthService.validateToken).toHaveBeenCalledWith('validated-by-passport');
    });

    it('should throw UnauthorizedException when payload is missing', async () => {
      await expect(strategy.validate(null as any)).rejects.toThrow(
        new UnauthorizedException('Token validation failed'),
      );
    });

    it('should throw UnauthorizedException when sub is missing', async () => {
      const invalidPayload = { ...validPayload };
      delete invalidPayload.sub;

      await expect(strategy.validate(invalidPayload as any)).rejects.toThrow(
        new UnauthorizedException('Token validation failed'),
      );
    });

    it('should throw UnauthorizedException when email is missing', async () => {
      const invalidPayload = { ...validPayload };
      delete invalidPayload.email;

      await expect(strategy.validate(invalidPayload as any)).rejects.toThrow(
        new UnauthorizedException('Token validation failed'),
      );
    });

    it('should throw UnauthorizedException when username is missing', async () => {
      const invalidPayload = { ...validPayload };
      delete invalidPayload.username;

      await expect(strategy.validate(invalidPayload as any)).rejects.toThrow(
        new UnauthorizedException('Token validation failed'),
      );
    });

    it('should throw UnauthorizedException when token validation service fails', async () => {
      (mockJwtAuthService.validateToken as jest.Mock).mockRejectedValue(
        new Error('Token validation failed'),
      );

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        new UnauthorizedException('Token validation failed'),
      );
    });

    it('should log error when validation fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (mockJwtAuthService.validateToken as jest.Mock).mockRejectedValue(
        new Error('Validation error'),
      );

      await expect(strategy.validate(validPayload)).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'JWT Strategy validation error:',
        'Validation error',
      );

      consoleSpy.mockRestore();
    });
  });
});