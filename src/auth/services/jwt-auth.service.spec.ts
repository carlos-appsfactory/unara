import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthService } from './jwt-auth.service';
import {
  JwtPayload,
  TokenPair,
  RefreshTokenPayload,
} from '../interfaces/jwt-payload.interface';

describe('JwtAuthService', () => {
  let service: JwtAuthService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
  };

  const mockAccessToken = 'mock.access.token';
  const mockRefreshToken = 'mock.refresh.token';
  const mockRefreshSecret = 'test-refresh-secret';

  beforeEach(async () => {
    const mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'JWT_REFRESH_SECRET':
            return mockRefreshSecret;
          case 'JWT_REFRESH_EXPIRES_IN':
            return '7d';
          default:
            return defaultValue;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<JwtAuthService>(JwtAuthService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if JWT_REFRESH_SECRET is not configured', async () => {
      const mockConfigServiceNoSecret = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'JWT_REFRESH_SECRET') return undefined;
          if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
          return undefined;
        }),
      };

      const mockJwtServiceForTest = {
        signAsync: jest.fn(),
        verifyAsync: jest.fn(),
        decode: jest.fn(),
      };

      await expect(async () => {
        await Test.createTestingModule({
          providers: [
            JwtAuthService,
            {
              provide: JwtService,
              useValue: mockJwtServiceForTest,
            },
            {
              provide: ConfigService,
              useValue: mockConfigServiceNoSecret,
            },
          ],
        }).compile();
      }).rejects.toThrow('JWT_REFRESH_SECRET is required but not configured');
    });
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      const result = await service.generateTokens(
        mockUser.id,
        mockUser.email,
        mockUser.username,
      );

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);

      // Verify access token payload
      const accessTokenCall = jwtService.signAsync.mock.calls[0];
      expect(accessTokenCall[0]).toEqual({
        sub: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
      });

      // Verify refresh token payload and options
      const refreshTokenCall = jwtService.signAsync.mock.calls[1];
      expect(refreshTokenCall[0]).toMatchObject({
        sub: mockUser.id,
        tokenId: expect.any(String),
      });
      expect(refreshTokenCall[1]).toEqual({
        secret: mockRefreshSecret,
        expiresIn: '7d',
      });
    });

    it('should throw UnauthorizedException when token generation fails', async () => {
      jwtService.signAsync.mockRejectedValue(new Error('JWT signing failed'));

      await expect(
        service.generateTokens(mockUser.id, mockUser.email, mockUser.username),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.generateTokens(mockUser.id, mockUser.email, mockUser.username),
      ).rejects.toThrow('Failed to generate authentication tokens');
    });
  });

  describe('validateToken', () => {
    const mockPayload: JwtPayload = {
      sub: mockUser.id,
      email: mockUser.email,
      username: mockUser.username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
    };

    it('should validate and return payload for valid token', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce(mockPayload);

      const result = await service.validateToken(mockAccessToken);

      expect(result).toEqual(mockPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockAccessToken);
    });

    it('should throw UnauthorizedException for empty token', async () => {
      await expect(service.validateToken('')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateToken('')).rejects.toThrow(
        'Token is required',
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      jwtService.verifyAsync.mockRejectedValue(expiredError);

      await expect(service.validateToken(mockAccessToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateToken(mockAccessToken)).rejects.toThrow(
        'Access token expired',
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const invalidError = new Error('Invalid token');
      invalidError.name = 'JsonWebTokenError';
      jwtService.verifyAsync.mockRejectedValue(invalidError);

      await expect(service.validateToken(mockAccessToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateToken(mockAccessToken)).rejects.toThrow(
        'Invalid access token',
      );
    });

    it('should throw UnauthorizedException for token with invalid payload', async () => {
      const invalidPayload = { sub: mockUser.id }; // Missing email and username
      jwtService.verifyAsync.mockResolvedValue(invalidPayload);

      await expect(service.validateToken(mockAccessToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateToken(mockAccessToken)).rejects.toThrow(
        'Invalid token payload',
      );
    });

    it('should handle generic errors during validation', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Generic error'));

      await expect(service.validateToken(mockAccessToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateToken(mockAccessToken)).rejects.toThrow(
        'Token validation failed',
      );
    });
  });

  describe('refreshTokens', () => {
    const mockRefreshPayload: RefreshTokenPayload = {
      sub: mockUser.id,
      tokenId: '456e7890-f12g-34h5-i678-901234567890',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
    };

    it('should refresh tokens with valid refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce(mockRefreshPayload);
      jwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      const result = await service.refreshTokens(
        mockRefreshToken,
        mockUser.email,
        mockUser.username,
      );

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockRefreshToken, {
        secret: mockRefreshSecret,
      });
    });

    it('should throw UnauthorizedException for empty refresh token', async () => {
      await expect(
        service.refreshTokens('', mockUser.email, mockUser.username),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.refreshTokens('', mockUser.email, mockUser.username),
      ).rejects.toThrow('Refresh token is required');
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      jwtService.verifyAsync.mockRejectedValue(expiredError);

      await expect(
        service.refreshTokens(
          mockRefreshToken,
          mockUser.email,
          mockUser.username,
        ),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.refreshTokens(
          mockRefreshToken,
          mockUser.email,
          mockUser.username,
        ),
      ).rejects.toThrow('Refresh token expired');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const invalidError = new Error('Invalid token');
      invalidError.name = 'JsonWebTokenError';
      jwtService.verifyAsync.mockRejectedValue(invalidError);

      await expect(
        service.refreshTokens(
          mockRefreshToken,
          mockUser.email,
          mockUser.username,
        ),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.refreshTokens(
          mockRefreshToken,
          mockUser.email,
          mockUser.username,
        ),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedException for refresh token with invalid payload', async () => {
      const invalidPayload = { sub: mockUser.id }; // Missing tokenId
      jwtService.verifyAsync.mockResolvedValue(invalidPayload);

      await expect(
        service.refreshTokens(
          mockRefreshToken,
          mockUser.email,
          mockUser.username,
        ),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.refreshTokens(
          mockRefreshToken,
          mockUser.email,
          mockUser.username,
        ),
      ).rejects.toThrow('Invalid refresh token payload');
    });

    it('should handle generic errors during refresh', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Generic error'));

      await expect(
        service.refreshTokens(
          mockRefreshToken,
          mockUser.email,
          mockUser.username,
        ),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.refreshTokens(
          mockRefreshToken,
          mockUser.email,
          mockUser.username,
        ),
      ).rejects.toThrow('Token refresh failed');
    });
  });

  describe('decodeToken', () => {
    const mockPayload: JwtPayload = {
      sub: mockUser.id,
      email: mockUser.email,
      username: mockUser.username,
    };

    it('should decode valid token without verification', () => {
      jwtService.decode.mockReturnValueOnce(mockPayload);

      const result = service.decodeToken(mockAccessToken);

      expect(result).toEqual(mockPayload);
      expect(jwtService.decode).toHaveBeenCalledWith(mockAccessToken);
    });

    it('should return null for invalid token', () => {
      jwtService.decode.mockImplementationOnce(() => {
        throw new Error('Invalid token format');
      });

      const result = service.decodeToken('invalid.token');

      expect(result).toBeNull();
    });
  });

  describe('security tests', () => {
    it('should use different secrets for access and refresh tokens', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      await service.generateTokens(
        mockUser.id,
        mockUser.email,
        mockUser.username,
      );

      const accessTokenCall = jwtService.signAsync.mock.calls[0];
      const refreshTokenCall = jwtService.signAsync.mock.calls[1];

      // Access token should not specify secret (uses default from module config)
      expect(accessTokenCall[1]).toBeUndefined();

      // Refresh token should specify different secret
      expect(refreshTokenCall[1]).toEqual({
        secret: mockRefreshSecret,
        expiresIn: '7d',
      });
    });

    it('should generate unique tokenId for each refresh token', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken)
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      await service.generateTokens(
        mockUser.id,
        mockUser.email,
        mockUser.username,
      );
      await service.generateTokens(
        mockUser.id,
        mockUser.email,
        mockUser.username,
      );

      const firstRefreshTokenCall = jwtService.signAsync.mock.calls[1];
      const secondRefreshTokenCall = jwtService.signAsync.mock.calls[3];

      expect(firstRefreshTokenCall[0].tokenId).not.toEqual(
        secondRefreshTokenCall[0].tokenId,
      );
    });
  });
});
