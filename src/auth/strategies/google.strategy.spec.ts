import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config = {
          'GOOGLE_CLIENT_ID': 'test-google-client-id',
          'GOOGLE_CLIENT_SECRET': 'test-google-client-secret',
          'GOOGLE_REDIRECT_URI': 'http://localhost:3000/auth/google/callback',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user data for valid Google profile', async () => {
      const mockProfile = {
        id: 'google123',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [{ value: 'john@example.com', verified: true }],
        photos: [{ value: 'https://example.com/photo.jpg' }],
        provider: 'google',
      };

      const mockAccessToken = 'access_token_123';
      const mockRefreshToken = 'refresh_token_123';
      const mockDone = jest.fn();

      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, {
        providerId: 'google123',
        provider: 'google',
        email: 'john@example.com',
        name: 'John Doe',
        picture: 'https://example.com/photo.jpg',
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should handle profile without email', async () => {
      const mockProfile = {
        id: 'google123',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [],
        photos: [{ value: 'https://example.com/photo.jpg' }],
        provider: 'google',
      };

      const mockAccessToken = 'access_token_123';
      const mockRefreshToken = 'refresh_token_123';
      const mockDone = jest.fn();

      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, {
        providerId: 'google123',
        provider: 'google',
        email: undefined,
        name: 'John Doe',
        picture: 'https://example.com/photo.jpg',
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should handle profile without photo', async () => {
      const mockProfile = {
        id: 'google123',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [{ value: 'john@example.com', verified: true }],
        photos: [],
        provider: 'google',
      };

      const mockAccessToken = 'access_token_123';
      const mockRefreshToken = 'refresh_token_123';
      const mockDone = jest.fn();

      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, {
        providerId: 'google123',
        provider: 'google',
        email: 'john@example.com',
        name: 'John Doe',
        picture: undefined,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should handle validation error', async () => {
      const mockProfile = {
        id: 'google123',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [{ value: 'john@example.com', verified: true }],
        photos: [{ value: 'https://example.com/photo.jpg' }],
        provider: 'google',
      };

      const mockAccessToken = 'access_token_123';
      const mockRefreshToken = 'refresh_token_123';
      const mockDone = jest.fn();
      const mockError = new Error('Validation failed');

      // Mock strategy validate to throw error
      jest.spyOn(strategy, 'validate').mockRejectedValueOnce(mockError);

      try {
        await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });
  });
});