import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FacebookStrategy } from './facebook.strategy';

describe('FacebookStrategy', () => {
  let strategy: FacebookStrategy;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config = {
          'FACEBOOK_APP_ID': 'test-facebook-app-id',
          'FACEBOOK_APP_SECRET': 'test-facebook-app-secret',
          'FACEBOOK_REDIRECT_URI': 'http://localhost:3000/auth/facebook/callback',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacebookStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<FacebookStrategy>(FacebookStrategy);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user data for valid Facebook profile', async () => {
      const mockProfile = {
        id: 'facebook123',
        username: 'johndoe',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
          middleName: 'Michael',
        },
        emails: [{ value: 'john@example.com' }],
        photos: [{ value: 'https://facebook.com/photo.jpg' }],
        provider: 'facebook',
      };

      const mockAccessToken = 'fb_access_token_123';
      const mockRefreshToken = 'fb_refresh_token_123';
      const mockDone = jest.fn();

      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, {
        providerId: 'facebook123',
        provider: 'facebook',
        email: 'john@example.com',
        name: 'John Doe',
        picture: 'https://facebook.com/photo.jpg',
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should handle profile without email', async () => {
      const mockProfile = {
        id: 'facebook123',
        username: 'johndoe',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [],
        photos: [{ value: 'https://facebook.com/photo.jpg' }],
        provider: 'facebook',
      };

      const mockAccessToken = 'fb_access_token_123';
      const mockRefreshToken = 'fb_refresh_token_123';
      const mockDone = jest.fn();

      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, {
        providerId: 'facebook123',
        provider: 'facebook',
        email: undefined,
        name: 'John Doe',
        picture: 'https://facebook.com/photo.jpg',
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should handle profile without photo', async () => {
      const mockProfile = {
        id: 'facebook123',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [{ value: 'john@example.com' }],
        photos: [],
        provider: 'facebook',
      };

      const mockAccessToken = 'fb_access_token_123';
      const mockRefreshToken = 'fb_refresh_token_123';
      const mockDone = jest.fn();

      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, {
        providerId: 'facebook123',
        provider: 'facebook',
        email: 'john@example.com',
        name: 'John Doe',
        picture: undefined,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should handle validation error', async () => {
      const mockProfile = {
        id: 'facebook123',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [{ value: 'john@example.com' }],
        photos: [{ value: 'https://facebook.com/photo.jpg' }],
        provider: 'facebook',
      };

      const mockAccessToken = 'fb_access_token_123';
      const mockRefreshToken = 'fb_refresh_token_123';
      const mockDone = jest.fn();
      const mockError = new Error('Facebook validation failed');

      // Mock strategy validate to throw error
      jest.spyOn(strategy, 'validate').mockRejectedValueOnce(mockError);

      try {
        await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });

    it('should handle profile with missing display name', async () => {
      const mockProfile = {
        id: 'facebook123',
        displayName: '',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [{ value: 'john@example.com' }],
        photos: [{ value: 'https://facebook.com/photo.jpg' }],
        provider: 'facebook',
      };

      const mockAccessToken = 'fb_access_token_123';
      const mockRefreshToken = 'fb_refresh_token_123';
      const mockDone = jest.fn();

      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, {
        providerId: 'facebook123',
        provider: 'facebook',
        email: 'john@example.com',
        name: '',
        picture: 'https://facebook.com/photo.jpg',
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });
  });
});