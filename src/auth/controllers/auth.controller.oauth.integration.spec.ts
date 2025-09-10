import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { EmailVerificationService } from '../services/email-verification.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { OAuthService } from '../services/oauth.service';
import { JwtAuthService } from '../services/jwt-auth.service';
import { User } from '../../users/entities/user.entity';
import { OAuthProvider } from '../entities/oauth-provider.entity';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { FacebookAuthGuard } from '../guards/facebook-auth.guard';
import { MicrosoftAuthGuard } from '../guards/microsoft-auth.guard';
import { AppleAuthGuard } from '../guards/apple-auth.guard';

describe('AuthController OAuth Integration', () => {
  let app: INestApplication;
  let authController: AuthController;
  let authService: jest.Mocked<AuthService>;
  let emailVerificationService: jest.Mocked<EmailVerificationService>;
  let tokenBlacklistService: jest.Mocked<TokenBlacklistService>;
  let oauthService: jest.Mocked<OAuthService>;
  let jwtAuthService: jest.Mocked<JwtAuthService>;
  let userRepository: jest.Mocked<Repository<User>>;
  let oauthProviderRepository: jest.Mocked<Repository<OAuthProvider>>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    password_hash: '',
    fullname: 'Test User',
    email_verified: true,
    last_login: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    oauthProviders: [],
  };

  const mockTokens = {
    accessToken: 'jwt_access_token',
    refreshToken: 'jwt_refresh_token',
  };

  const mockOAuthResult = {
    user: mockUser,
    tokens: mockTokens,
    isNewUser: false,
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockOAuthProviderRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      validateUser: jest.fn(),
    };

    const mockEmailVerificationService = {
      sendVerificationEmail: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerificationEmail: jest.fn(),
    };

    const mockTokenBlacklistService = {
      addToBlacklist: jest.fn(),
      isBlacklisted: jest.fn(),
    };

    const mockOAuthService = {
      authenticateWithOAuth: jest.fn(),
      getUserOAuthProviders: jest.fn(),
      unlinkOAuthProvider: jest.fn(),
    };

    const mockJwtAuthService = {
      generateTokens: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config = {
          'GOOGLE_CLIENT_ID': 'test-google-client-id',
          'GOOGLE_CLIENT_SECRET': 'test-google-client-secret',
          'FACEBOOK_APP_ID': 'test-facebook-app-id',
          'FACEBOOK_APP_SECRET': 'test-facebook-app-secret',
          'MICROSOFT_CLIENT_ID': 'test-microsoft-client-id',
          'MICROSOFT_CLIENT_SECRET': 'test-microsoft-client-secret',
          'APPLE_CLIENT_ID': 'test.app.id',
          'JWT_ACCESS_SECRET': 'test-access-secret',
        };
        return config[key];
      }),
    };

    // Mock the OAuth guards to avoid actual OAuth flow
    const mockGuardCanActivate = jest.fn().mockImplementation((context) => {
      const request = context.switchToHttp().getRequest();
      
      // Mock user profile based on the provider
      if (request.url.includes('/google')) {
        request.user = {
          providerId: 'google123',
          provider: 'google',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/photo.jpg',
          accessToken: 'google_access_token',
          refreshToken: 'google_refresh_token',
        };
      } else if (request.url.includes('/facebook')) {
        request.user = {
          providerId: 'facebook123',
          provider: 'facebook',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://facebook.com/photo.jpg',
          accessToken: 'facebook_access_token',
          refreshToken: 'facebook_refresh_token',
        };
      } else if (request.url.includes('/microsoft')) {
        request.user = {
          providerId: 'microsoft123',
          provider: 'microsoft',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://graph.microsoft.com/photo.jpg',
          accessToken: 'microsoft_access_token',
          refreshToken: 'microsoft_refresh_token',
        };
      } else if (request.url.includes('/apple') || request.method === 'POST') {
        // Only populate user if id_token is provided
        if (request.body?.id_token) {
          request.user = {
            providerId: 'apple123',
            provider: 'apple',
            email: 'test@example.com',
            name: 'Test User',
            picture: undefined,
            accessToken: request.body.id_token,
            refreshToken: undefined,
          };
        } else {
          // If no id_token, guard should not populate user (simulating auth failure)
          return false;
        }
      }
      
      return true;
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
        {
          provide: OAuthService,
          useValue: mockOAuthService,
        },
        {
          provide: JwtAuthService,
          useValue: mockJwtAuthService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(OAuthProvider),
          useValue: mockOAuthProviderRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    })
      .overrideGuard(GoogleAuthGuard)
      .useValue({ canActivate: mockGuardCanActivate })
      .overrideGuard(FacebookAuthGuard)
      .useValue({ canActivate: mockGuardCanActivate })
      .overrideGuard(MicrosoftAuthGuard)
      .useValue({ canActivate: mockGuardCanActivate })
      .overrideGuard(AppleAuthGuard)
      .useValue({ canActivate: mockGuardCanActivate })
      .compile();

    app = module.createNestApplication();
    await app.init();

    authController = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    emailVerificationService = module.get(EmailVerificationService);
    tokenBlacklistService = module.get(TokenBlacklistService);
    oauthService = module.get(OAuthService);
    jwtAuthService = module.get(JwtAuthService);
    userRepository = module.get(getRepositoryToken(User));
    oauthProviderRepository = module.get(getRepositoryToken(OAuthProvider));
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Google OAuth', () => {
    it('GET /auth/google should initiate Google OAuth', async () => {
      // In our mocked environment, the guard allows the request through
      // In production, this would redirect to Google OAuth
      const response = await request(app.getHttpServer())
        .get('/auth/google')
        .expect(200);
    });

    it('GET /auth/google/callback should handle Google OAuth callback', async () => {
      oauthService.authenticateWithOAuth.mockResolvedValue(mockOAuthResult);

      const response = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .expect(200);

      expect(response.body).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          fullname: mockUser.fullname,
          email_verified: mockUser.email_verified,
        },
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        provider: 'google',
        isNewUser: false,
      });

      expect(oauthService.authenticateWithOAuth).toHaveBeenCalledWith({
        providerId: 'google123',
        provider: 'google',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
        accessToken: 'google_access_token',
        refreshToken: 'google_refresh_token',
      });
    });

    it('GET /auth/google/callback should handle OAuth service errors', async () => {
      oauthService.authenticateWithOAuth.mockRejectedValue(new Error('OAuth failed'));

      const response = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .expect(500);

      expect(response.body.message).toBe('Internal server error');
      expect(response.body.statusCode).toBe(500);
    });
  });

  describe('Facebook OAuth', () => {
    it('GET /auth/facebook should initiate Facebook OAuth', async () => {
      // In our mocked environment, the guard allows the request through
      // In production, this would redirect to Facebook OAuth
      const response = await request(app.getHttpServer())
        .get('/auth/facebook')
        .expect(200);
    });

    it('GET /auth/facebook/callback should handle Facebook OAuth callback', async () => {
      oauthService.authenticateWithOAuth.mockResolvedValue(mockOAuthResult);

      const response = await request(app.getHttpServer())
        .get('/auth/facebook/callback')
        .expect(200);

      expect(response.body).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          fullname: mockUser.fullname,
          email_verified: mockUser.email_verified,
        },
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        provider: 'facebook',
        isNewUser: false,
      });

      expect(oauthService.authenticateWithOAuth).toHaveBeenCalledWith({
        providerId: 'facebook123',
        provider: 'facebook',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://facebook.com/photo.jpg',
        accessToken: 'facebook_access_token',
        refreshToken: 'facebook_refresh_token',
      });
    });
  });

  describe('Microsoft OAuth', () => {
    it('GET /auth/microsoft should initiate Microsoft OAuth', async () => {
      // In our mocked environment, the guard allows the request through
      // In production, this would redirect to Microsoft OAuth
      const response = await request(app.getHttpServer())
        .get('/auth/microsoft')
        .expect(200);
    });

    it('GET /auth/microsoft/callback should handle Microsoft OAuth callback', async () => {
      oauthService.authenticateWithOAuth.mockResolvedValue(mockOAuthResult);

      const response = await request(app.getHttpServer())
        .get('/auth/microsoft/callback')
        .expect(200);

      expect(response.body).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          fullname: mockUser.fullname,
          email_verified: mockUser.email_verified,
        },
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        provider: 'microsoft',
        isNewUser: false,
      });

      expect(oauthService.authenticateWithOAuth).toHaveBeenCalledWith({
        providerId: 'microsoft123',
        provider: 'microsoft',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://graph.microsoft.com/photo.jpg',
        accessToken: 'microsoft_access_token',
        refreshToken: 'microsoft_refresh_token',
      });
    });
  });

  describe('Apple OAuth', () => {
    it('POST /auth/apple should handle Apple ID token', async () => {
      oauthService.authenticateWithOAuth.mockResolvedValue(mockOAuthResult);

      const mockAppleIdToken = 'valid.apple.token';
      
      const response = await request(app.getHttpServer())
        .post('/auth/apple')
        .send({ id_token: mockAppleIdToken })
        .expect(200);

      expect(response.body).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          fullname: mockUser.fullname,
          email_verified: mockUser.email_verified,
        },
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        provider: 'apple',
        isNewUser: false,
      });
    });

    it('POST /auth/apple should reject requests without id_token', async () => {
      // The guard mock now returns false when no id_token is provided
      // This simulates the real Apple guard behavior
      const response = await request(app.getHttpServer())
        .post('/auth/apple')
        .send({})
        .expect(403); // Forbidden when guard returns false
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable errors', async () => {
      oauthService.authenticateWithOAuth.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .expect(500);

      expect(response.body.message).toBe('Internal server error');
      expect(response.body.statusCode).toBe(500);
    });

    it('should handle OAuth provider errors', async () => {
      oauthService.authenticateWithOAuth.mockRejectedValue(new Error('Provider temporarily unavailable'));

      const response = await request(app.getHttpServer())
        .get('/auth/facebook/callback')
        .expect(500);

      expect(response.body.message).toBe('Internal server error');
      expect(response.body.statusCode).toBe(500);
    });
  });

  describe('User Linking', () => {
    it('should handle new user registration', async () => {
      const newUserResult = {
        ...mockOAuthResult,
        isNewUser: true,
      };
      
      oauthService.authenticateWithOAuth.mockResolvedValue(newUserResult);

      const response = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .expect(200);

      expect(response.body).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          fullname: mockUser.fullname,
          email_verified: mockUser.email_verified,
        },
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        provider: 'google',
        isNewUser: true,
      });
    });

    it('should handle existing user linking', async () => {
      oauthService.authenticateWithOAuth.mockResolvedValue(mockOAuthResult);

      const response = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .expect(200);

      expect(response.body).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          fullname: mockUser.fullname,
          email_verified: mockUser.email_verified,
        },
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        provider: 'google',
        isNewUser: false,
      });
    });
  });
});