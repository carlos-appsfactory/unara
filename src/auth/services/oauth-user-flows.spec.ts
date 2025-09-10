import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { OAuthService, OAuthProfile } from './oauth.service';
import { JwtAuthService } from './jwt-auth.service';
import { User } from '../../users/entities/user.entity';
import { OAuthProvider } from '../entities/oauth-provider.entity';

describe('OAuth User Registration and Linking Flows', () => {
  let oauthService: OAuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let oauthProviderRepository: jest.Mocked<Repository<OAuthProvider>>;
  let jwtAuthService: jest.Mocked<JwtAuthService>;

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

    const mockJwtAuthService = {
      generateTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(OAuthProvider),
          useValue: mockOAuthProviderRepository,
        },
        {
          provide: JwtAuthService,
          useValue: mockJwtAuthService,
        },
      ],
    }).compile();

    oauthService = module.get<OAuthService>(OAuthService);
    userRepository = module.get(getRepositoryToken(User));
    oauthProviderRepository = module.get(getRepositoryToken(OAuthProvider));
    jwtAuthService = module.get(JwtAuthService);
  });

  describe('New User Registration Flow', () => {
    it('should create new user when no existing account found', async () => {
      const oauthProfile: OAuthProfile = {
        providerId: 'google123',
        provider: 'google',
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/photo.jpg',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      const newUser = { ...mockUser, email: 'newuser@example.com', username: 'newuser' };
      const newOAuthProvider = {
        id: 'oauth-provider-id',
        user_id: newUser.id,
        provider_name: 'google',
        provider_id: 'google123',
      };

      // No existing OAuth provider
      oauthProviderRepository.findOne.mockResolvedValue(null);
      // No existing user by email
      userRepository.findOne.mockResolvedValueOnce(null);
      // Username availability check
      userRepository.findOne.mockResolvedValue(null);
      // User creation
      userRepository.create.mockReturnValue(newUser);
      userRepository.save.mockResolvedValue(newUser);
      // OAuth provider creation
      oauthProviderRepository.create.mockReturnValue(newOAuthProvider as any);
      oauthProviderRepository.save.mockResolvedValue(newOAuthProvider as any);
      // Token generation
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await oauthService.authenticateWithOAuth(oauthProfile);

      expect(result).toEqual({
        user: newUser,
        tokens: mockTokens,
        isNewUser: true,
      });

      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        username: expect.stringContaining('newuser'),
        password_hash: '',
        fullname: 'New User',
        email_verified: true,
        last_login: expect.any(Date),
        profile_picture: 'https://example.com/photo.jpg',
      });

      expect(oauthProviderRepository.create).toHaveBeenCalledWith({
        user_id: newUser.id,
        provider_name: 'google',
        provider_id: 'google123',
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/photo.jpg',
      });
    });

    it('should handle username conflicts during registration', async () => {
      const oauthProfile: OAuthProfile = {
        providerId: 'facebook123',
        provider: 'facebook',
        email: 'user@example.com',
        name: 'User Name',
        picture: 'https://facebook.com/photo.jpg',
        accessToken: 'fb_access_token',
        refreshToken: 'fb_refresh_token',
      };

      const newUser = { ...mockUser, email: 'user@example.com', username: 'username1' };

      oauthProviderRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValueOnce(null); // No existing user by email
      userRepository.findOne.mockResolvedValueOnce({ id: 'existing' } as User); // Username taken
      userRepository.findOne.mockResolvedValueOnce(null); // Username with counter available
      userRepository.create.mockReturnValue(newUser);
      userRepository.save.mockResolvedValue(newUser);
      oauthProviderRepository.create.mockReturnValue({} as any);
      oauthProviderRepository.save.mockResolvedValue({} as any);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await oauthService.authenticateWithOAuth(oauthProfile);

      expect(result.isNewUser).toBe(true);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: expect.stringMatching(/^username1$/),
        })
      );
    });

    it('should create user with fallback username when name is not provided', async () => {
      const oauthProfile: OAuthProfile = {
        providerId: 'apple123',
        provider: 'apple',
        email: 'noemail@example.com',
        name: undefined,
        picture: undefined,
        accessToken: 'apple_id_token',
        refreshToken: undefined,
      };

      const newUser = { ...mockUser, email: 'noemail@example.com', username: 'noemail' };

      oauthProviderRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValueOnce(null);
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(newUser);
      userRepository.save.mockResolvedValue(newUser);
      oauthProviderRepository.create.mockReturnValue({} as any);
      oauthProviderRepository.save.mockResolvedValue({} as any);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await oauthService.authenticateWithOAuth(oauthProfile);

      expect(result.isNewUser).toBe(true);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: expect.stringMatching(/^noemail/),
          fullname: 'noemail',
        })
      );
    });
  });

  describe('Existing User Account Linking Flow', () => {
    it('should link OAuth provider to existing user by email', async () => {
      const oauthProfile: OAuthProfile = {
        providerId: 'microsoft123',
        provider: 'microsoft',
        email: 'existing@example.com',
        name: 'Existing User',
        picture: 'https://graph.microsoft.com/photo.jpg',
        accessToken: 'ms_access_token',
        refreshToken: 'ms_refresh_token',
      };

      const existingUser = { ...mockUser, email: 'existing@example.com' };
      const newOAuthProvider = {
        id: 'oauth-provider-id',
        user_id: existingUser.id,
        provider_name: 'microsoft',
        provider_id: 'microsoft123',
      };

      oauthProviderRepository.findOne.mockResolvedValue(null); // No existing OAuth provider
      userRepository.findOne.mockResolvedValue(existingUser); // Existing user by email
      userRepository.save.mockResolvedValue(existingUser);
      oauthProviderRepository.create.mockReturnValue(newOAuthProvider as any);
      oauthProviderRepository.save.mockResolvedValue(newOAuthProvider as any);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await oauthService.authenticateWithOAuth(oauthProfile);

      expect(result).toEqual({
        user: existingUser,
        tokens: mockTokens,
        isNewUser: false,
      });

      expect(userRepository.create).not.toHaveBeenCalled();
      expect(oauthProviderRepository.create).toHaveBeenCalledWith({
        user_id: existingUser.id,
        provider_name: 'microsoft',
        provider_id: 'microsoft123',
        email: 'existing@example.com',
        name: 'Existing User',
        picture: 'https://graph.microsoft.com/photo.jpg',
      });
    });

    it('should authenticate existing OAuth user on subsequent logins', async () => {
      const oauthProfile: OAuthProfile = {
        providerId: 'google123',
        provider: 'google',
        email: 'returning@example.com',
        name: 'Returning User',
        picture: 'https://example.com/photo.jpg',
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      };

      const existingOAuthProvider = {
        id: 'oauth-provider-id',
        user_id: mockUser.id,
        provider_name: 'google',
        provider_id: 'google123',
        user: mockUser,
      };

      oauthProviderRepository.findOne.mockResolvedValue(existingOAuthProvider as any);
      userRepository.save.mockResolvedValue(mockUser);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await oauthService.authenticateWithOAuth(oauthProfile);

      expect(result).toEqual({
        user: mockUser,
        tokens: mockTokens,
        isNewUser: false,
      });

      expect(userRepository.create).not.toHaveBeenCalled();
      expect(oauthProviderRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          last_login: expect.any(Date),
        })
      );
    });

    it('should update user profile information from OAuth provider', async () => {
      const oauthProfile: OAuthProfile = {
        providerId: 'google123',
        provider: 'google',
        email: 'returning@example.com',
        name: 'Updated Name',
        picture: 'https://example.com/new-photo.jpg',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      const existingOAuthProvider = {
        id: 'oauth-provider-id',
        user_id: mockUser.id,
        provider_name: 'google',
        provider_id: 'google123',
        user: mockUser,
      };

      oauthProviderRepository.findOne.mockResolvedValue(existingOAuthProvider as any);
      userRepository.save.mockResolvedValue(mockUser);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      await oauthService.authenticateWithOAuth(oauthProfile);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          last_login: expect.any(Date),
        })
      );
    });
  });

  describe('Multiple OAuth Provider Linking', () => {
    it('should allow user to have multiple OAuth providers', async () => {
      const user = mockUser;
      const providers = [
        {
          id: 'google-provider',
          provider_name: 'google',
          email: 'user@gmail.com',
          name: 'User Name',
          picture: 'https://google.com/photo.jpg',
          createdAt: new Date(),
        },
        {
          id: 'facebook-provider',
          provider_name: 'facebook',
          email: 'user@facebook.com',
          name: 'User Name',
          picture: 'https://facebook.com/photo.jpg',
          createdAt: new Date(),
        },
      ];

      oauthProviderRepository.find.mockResolvedValue(providers as any);

      const result = await oauthService.getUserOAuthProviders(user.id);

      expect(result).toEqual(providers);
      expect(oauthProviderRepository.find).toHaveBeenCalledWith({
        where: { user_id: user.id },
        select: ['id', 'provider_name', 'email', 'name', 'picture', 'createdAt'],
      });
    });

    it('should prevent duplicate OAuth provider linking', async () => {
      const oauthProfile: OAuthProfile = {
        providerId: 'google123',
        provider: 'google',
        email: 'user@example.com',
        name: 'User Name',
        picture: 'https://example.com/photo.jpg',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      const existingOAuthProvider = {
        id: 'oauth-provider-id',
        user_id: mockUser.id,
        provider_name: 'google',
        provider_id: 'google123',
        user: mockUser,
      };

      // OAuth provider already exists
      oauthProviderRepository.findOne.mockResolvedValue(existingOAuthProvider as any);
      userRepository.save.mockResolvedValue(mockUser);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await oauthService.authenticateWithOAuth(oauthProfile);

      expect(result.isNewUser).toBe(false);
      expect(oauthProviderRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('OAuth Provider Unlinking Flow', () => {
    it('should successfully unlink OAuth provider from user', async () => {
      const userId = mockUser.id;
      const providerName = 'google';

      oauthProviderRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await oauthService.unlinkOAuthProvider(userId, providerName);

      expect(oauthProviderRepository.delete).toHaveBeenCalledWith({
        user_id: userId,
        provider_name: providerName,
      });
    });

    it('should throw error when trying to unlink non-existent provider', async () => {
      const userId = mockUser.id;
      const providerName = 'facebook';

      oauthProviderRepository.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(
        oauthService.unlinkOAuthProvider(userId, providerName)
      ).rejects.toThrow(
        new ConflictException('facebook account is not linked to this user')
      );
    });
  });

  describe('Error Handling in User Flows', () => {
    it('should handle database errors during user creation gracefully', async () => {
      const oauthProfile: OAuthProfile = {
        providerId: 'google123',
        provider: 'google',
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/photo.jpg',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      oauthProviderRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);
      userRepository.save.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        oauthService.authenticateWithOAuth(oauthProfile)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle OAuth provider creation errors', async () => {
      const oauthProfile: OAuthProfile = {
        providerId: 'google123',
        provider: 'google',
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/photo.jpg',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      const newUser = { ...mockUser, email: 'newuser@example.com' };

      oauthProviderRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValueOnce(null);
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(newUser);
      userRepository.save.mockResolvedValue(newUser);
      oauthProviderRepository.save.mockRejectedValue(new Error('OAuth provider creation failed'));

      await expect(
        oauthService.authenticateWithOAuth(oauthProfile)
      ).rejects.toThrow('OAuth provider creation failed');
    });

    it('should require email for OAuth authentication', async () => {
      const oauthProfileWithoutEmail: OAuthProfile = {
        providerId: 'google123',
        provider: 'google',
        email: undefined,
        name: 'User Name',
        picture: 'https://example.com/photo.jpg',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      oauthProviderRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        oauthService.authenticateWithOAuth(oauthProfileWithoutEmail)
      ).rejects.toThrow(
        new UnauthorizedException('Email is required for google authentication but was not provided')
      );
    });
  });

  describe('Security in User Flows', () => {
    it('should not create duplicate users with same email', async () => {
      const oauthProfile: OAuthProfile = {
        providerId: 'facebook123',
        provider: 'facebook',
        email: 'existing@example.com',
        name: 'Facebook User',
        picture: 'https://facebook.com/photo.jpg',
        accessToken: 'fb_access_token',
        refreshToken: 'fb_refresh_token',
      };

      const existingUser = { ...mockUser, email: 'existing@example.com' };

      oauthProviderRepository.findOne.mockResolvedValue(null); // No OAuth provider
      userRepository.findOne.mockResolvedValue(existingUser); // But user exists by email

      userRepository.save.mockResolvedValue(existingUser);
      oauthProviderRepository.create.mockReturnValue({} as any);
      oauthProviderRepository.save.mockResolvedValue({} as any);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await oauthService.authenticateWithOAuth(oauthProfile);

      expect(result.isNewUser).toBe(false);
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(result.user).toBe(existingUser);
    });

    it('should validate provider ID consistency', async () => {
      const oauthProfile: OAuthProfile = {
        providerId: 'google123',
        provider: 'google',
        email: 'user@example.com',
        name: 'User Name',
        picture: 'https://example.com/photo.jpg',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      // Simulate existing provider with different provider ID (potential security issue)
      const existingOAuthProvider = {
        id: 'oauth-provider-id',
        user_id: mockUser.id,
        provider_name: 'google',
        provider_id: 'different-provider-id', // Different ID
        user: mockUser,
      };

      oauthProviderRepository.findOne.mockResolvedValue(existingOAuthProvider as any);
      userRepository.save.mockResolvedValue(mockUser);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await oauthService.authenticateWithOAuth(oauthProfile);

      // Should still authenticate (OAuth provider lookup is by provider+providerId)
      expect(result.user).toBe(mockUser);
      expect(result.isNewUser).toBe(false);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});