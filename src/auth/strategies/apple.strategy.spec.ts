import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AppleStrategy } from './apple.strategy';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('AppleStrategy', () => {
  let strategy: AppleStrategy;
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

    strategy = module.get<AppleStrategy>(AppleStrategy);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user data for valid Apple ID token', async () => {
      const mockJwtPayload = {
        iss: 'https://appleid.apple.com',
        aud: 'test.app.id',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
        sub: 'apple123.user',
        email: 'john@example.com',
        email_verified: true,
      };

      const mockIdToken = 'valid.jwt.token';
      const mockRequest = {
        body: { id_token: mockIdToken },
      };

      (jwt.decode as jest.Mock).mockReturnValueOnce({ header: 'mock' });
      (jwt.decode as jest.Mock).mockReturnValueOnce(mockJwtPayload);

      const result = await strategy.validate(mockRequest as any);

      expect(result).toEqual({
        providerId: 'apple123.user',
        provider: 'apple',
        email: 'john@example.com',
        name: undefined,
        picture: undefined,
        accessToken: mockIdToken,
        refreshToken: undefined,
      });
    });

    it('should handle Apple token without email', async () => {
      const mockJwtPayload = {
        iss: 'https://appleid.apple.com',
        aud: 'test.app.id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: 'apple123.user',
      };

      const mockIdToken = 'valid.jwt.token';
      const mockRequest = {
        body: { id_token: mockIdToken },
      };

      (jwt.decode as jest.Mock).mockReturnValueOnce({ header: 'mock' });
      (jwt.decode as jest.Mock).mockReturnValueOnce(mockJwtPayload);

      const result = await strategy.validate(mockRequest as any);

      expect(result).toEqual({
        providerId: 'apple123.user',
        provider: 'apple',
        email: undefined,
        name: undefined,
        picture: undefined,
        accessToken: mockIdToken,
        refreshToken: undefined,
      });
    });

    it('should throw UnauthorizedException when id_token is missing', async () => {
      const mockRequest = {
        body: {},
      };

      await expect(strategy.validate(mockRequest as any)).rejects.toThrow(
        new UnauthorizedException('Apple ID token is required')
      );
    });

    it('should throw UnauthorizedException for invalid token format', async () => {
      const mockIdToken = 'invalid.token';
      const mockRequest = {
        body: { id_token: mockIdToken },
      };

      (jwt.decode as jest.Mock).mockReturnValueOnce(null);

      await expect(strategy.validate(mockRequest as any)).rejects.toThrow(
        new UnauthorizedException('Invalid Apple ID token format')
      );
    });

    it('should throw UnauthorizedException for invalid token payload', async () => {
      const mockIdToken = 'valid.jwt.token';
      const mockRequest = {
        body: { id_token: mockIdToken },
      };

      (jwt.decode as jest.Mock).mockReturnValueOnce({ header: 'mock' });
      (jwt.decode as jest.Mock).mockReturnValueOnce(null);

      await expect(strategy.validate(mockRequest as any)).rejects.toThrow(
        new UnauthorizedException('Invalid Apple ID token payload')
      );
    });

    it('should throw UnauthorizedException for invalid issuer', async () => {
      const mockJwtPayload = {
        iss: 'https://invalid-issuer.com',
        aud: 'test.app.id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: 'apple123.user',
      };

      const mockIdToken = 'valid.jwt.token';
      const mockRequest = {
        body: { id_token: mockIdToken },
      };

      (jwt.decode as jest.Mock).mockReturnValueOnce({ header: 'mock' });
      (jwt.decode as jest.Mock).mockReturnValueOnce(mockJwtPayload);

      await expect(strategy.validate(mockRequest as any)).rejects.toThrow(
        new UnauthorizedException('Invalid Apple token issuer')
      );
    });

    it('should throw UnauthorizedException for invalid audience', async () => {
      const mockJwtPayload = {
        iss: 'https://appleid.apple.com',
        aud: 'wrong.app.id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: 'apple123.user',
      };

      const mockIdToken = 'valid.jwt.token';
      const mockRequest = {
        body: { id_token: mockIdToken },
      };

      (jwt.decode as jest.Mock).mockReturnValueOnce({ header: 'mock' });
      (jwt.decode as jest.Mock).mockReturnValueOnce(mockJwtPayload);

      await expect(strategy.validate(mockRequest as any)).rejects.toThrow(
        new UnauthorizedException('Invalid Apple token audience')
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const mockJwtPayload = {
        iss: 'https://appleid.apple.com',
        aud: 'test.app.id',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        sub: 'apple123.user',
      };

      const mockIdToken = 'expired.jwt.token';
      const mockRequest = {
        body: { id_token: mockIdToken },
      };

      (jwt.decode as jest.Mock).mockReturnValueOnce({ header: 'mock' });
      (jwt.decode as jest.Mock).mockReturnValueOnce(mockJwtPayload);

      await expect(strategy.validate(mockRequest as any)).rejects.toThrow(
        new UnauthorizedException('Apple token has expired')
      );
    });

    it('should handle JWT decode errors gracefully', async () => {
      const mockIdToken = 'malformed.jwt.token';
      const mockRequest = {
        body: { id_token: mockIdToken },
      };

      (jwt.decode as jest.Mock).mockImplementationOnce(() => {
        throw new Error('JWT malformed');
      });

      await expect(strategy.validate(mockRequest as any)).rejects.toThrow(
        new UnauthorizedException('Apple authentication failed')
      );
    });
  });
});