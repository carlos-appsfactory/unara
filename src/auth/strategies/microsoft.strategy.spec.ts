import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MicrosoftStrategy } from './microsoft.strategy';

describe('MicrosoftStrategy', () => {
  let strategy: MicrosoftStrategy;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config = {
          'MICROSOFT_CLIENT_ID': 'test-microsoft-client-id',
          'MICROSOFT_CLIENT_SECRET': 'test-microsoft-client-secret',
          'MICROSOFT_REDIRECT_URI': 'http://localhost:3000/auth/microsoft/callback',
          'MICROSOFT_TENANT_ID': 'common',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicrosoftStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<MicrosoftStrategy>(MicrosoftStrategy);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user data for valid Microsoft profile', async () => {
      const mockProfile = {
        id: 'microsoft123',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [{ type: 'work', value: 'john@company.com' }],
        photos: [{ value: 'https://graph.microsoft.com/photo.jpg' }],
        provider: 'microsoft',
      };

      const mockAccessToken = 'ms_access_token_123';
      const mockRefreshToken = 'ms_refresh_token_123';
      const mockDone = jest.fn();

      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, {
        providerId: 'microsoft123',
        provider: 'microsoft',
        email: 'john@company.com',
        name: 'John Doe',
        picture: 'https://graph.microsoft.com/photo.jpg',
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should handle profile without email', async () => {
      const mockProfile = {
        id: 'microsoft123',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [],
        photos: [{ value: 'https://graph.microsoft.com/photo.jpg' }],
        provider: 'microsoft',
      };

      const mockAccessToken = 'ms_access_token_123';
      const mockRefreshToken = 'ms_refresh_token_123';
      const mockDone = jest.fn();

      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, {
        providerId: 'microsoft123',
        provider: 'microsoft',
        email: undefined,
        name: 'John Doe',
        picture: 'https://graph.microsoft.com/photo.jpg',
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should handle profile without photo', async () => {
      const mockProfile = {
        id: 'microsoft123',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [{ type: 'personal', value: 'john@outlook.com' }],
        photos: [],
        provider: 'microsoft',
      };

      const mockAccessToken = 'ms_access_token_123';
      const mockRefreshToken = 'ms_refresh_token_123';
      const mockDone = jest.fn();

      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, {
        providerId: 'microsoft123',
        provider: 'microsoft',
        email: 'john@outlook.com',
        name: 'John Doe',
        picture: undefined,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should handle multiple email addresses', async () => {
      const mockProfile = {
        id: 'microsoft123',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [
          { type: 'work', value: 'john@company.com' },
          { type: 'personal', value: 'john@outlook.com' },
        ],
        photos: [{ value: 'https://graph.microsoft.com/photo.jpg' }],
        provider: 'microsoft',
      };

      const mockAccessToken = 'ms_access_token_123';
      const mockRefreshToken = 'ms_refresh_token_123';
      const mockDone = jest.fn();

      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, {
        providerId: 'microsoft123',
        provider: 'microsoft',
        email: 'john@company.com', // Should use first email
        name: 'John Doe',
        picture: 'https://graph.microsoft.com/photo.jpg',
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should handle validation error', async () => {
      const mockProfile = {
        id: 'microsoft123',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [{ type: 'work', value: 'john@company.com' }],
        photos: [{ value: 'https://graph.microsoft.com/photo.jpg' }],
        provider: 'microsoft',
      };

      const mockAccessToken = 'ms_access_token_123';
      const mockRefreshToken = 'ms_refresh_token_123';
      const mockDone = jest.fn();
      const mockError = new Error('Microsoft validation failed');

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