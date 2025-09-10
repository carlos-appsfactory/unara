import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { OAuthService, OAuthProfile } from './oauth.service';
import { JwtAuthService } from './jwt-auth.service';
import { User } from '../../users/entities/user.entity';
import { OAuthProvider } from '../entities/oauth-provider.entity';

describe('OAuthService', () => {
  let service: OAuthService;
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

  const mockOAuthProfile: OAuthProfile = {
    providerId: 'google123',
    provider: 'google',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/photo.jpg',
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
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

    service = module.get<OAuthService>(OAuthService);
    userRepository = module.get(getRepositoryToken(User));
    oauthProviderRepository = module.get(getRepositoryToken(OAuthProvider));
    jwtAuthService = module.get(JwtAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('authenticateWithOAuth', () => {
    it('should authenticate existing OAuth user', async () => {
      const mockOAuthProvider = {
        id: 'oauth-provider-id',
        user_id: mockUser.id,
        provider_name: 'google',
        provider_id: 'google123',
        user: mockUser,
      };

      oauthProviderRepository.findOne.mockResolvedValue(mockOAuthProvider as any);
      userRepository.save.mockResolvedValue(mockUser);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await service.authenticateWithOAuth(mockOAuthProfile);

      expect(result).toEqual({
        user: mockUser,
        tokens: mockTokens,
        isNewUser: false,
      });

      expect(oauthProviderRepository.findOne).toHaveBeenCalledWith({
        where: { provider_name: 'google', provider_id: 'google123' },
        relations: ['user'],
      });
    });

    it('should link OAuth account to existing user by email', async () => {
      oauthProviderRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(mockUser);
      oauthProviderRepository.create.mockReturnValue({} as any);
      oauthProviderRepository.save.mockResolvedValue({} as any);
      userRepository.save.mockResolvedValue(mockUser);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await service.authenticateWithOAuth(mockOAuthProfile);

      expect(result).toEqual({
        user: mockUser,
        tokens: mockTokens,
        isNewUser: false,
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should create new user for OAuth profile', async () => {
      oauthProviderRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValueOnce(null); // No existing user
      userRepository.findOne.mockResolvedValue(null); // Username check
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      oauthProviderRepository.create.mockReturnValue({} as any);
      oauthProviderRepository.save.mockResolvedValue({} as any);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await service.authenticateWithOAuth(mockOAuthProfile);

      expect(result).toEqual({
        user: mockUser,
        tokens: mockTokens,
        isNewUser: true,
      });

      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        username: expect.any(String),
        password_hash: '',
        fullname: 'Test User',
        email_verified: true,
        last_login: expect.any(Date),
        profile_picture: 'https://example.com/photo.jpg',
      });
    });

    it('should throw error when OAuth profile has no email', async () => {
      const profileWithoutEmail = { ...mockOAuthProfile, email: undefined };

      oauthProviderRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.authenticateWithOAuth(profileWithoutEmail)
      ).rejects.toThrow(
        new UnauthorizedException('Email is required for google authentication but was not provided')
      );
    });

    it('should generate unique username when display name is not provided', async () => {
      const profileWithoutName = { ...mockOAuthProfile, name: undefined };

      oauthProviderRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValueOnce(null); // No existing user
      userRepository.findOne.mockResolvedValue(null); // Username check
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      oauthProviderRepository.create.mockReturnValue({} as any);
      oauthProviderRepository.save.mockResolvedValue({} as any);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      await service.authenticateWithOAuth(profileWithoutName);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: expect.stringMatching(/^test/),
          fullname: 'test',
        })
      );
    });

    it('should handle username conflicts by appending counter', async () => {
      const profileWithShortName = { ...mockOAuthProfile, name: 'ab' };

      oauthProviderRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValueOnce(null); // No existing user
      userRepository.findOne.mockResolvedValueOnce({ id: 'existing' } as User); // Username exists
      userRepository.findOne.mockResolvedValueOnce(null); // Username with counter available
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      oauthProviderRepository.create.mockReturnValue({} as any);
      oauthProviderRepository.save.mockResolvedValue({} as any);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      await service.authenticateWithOAuth(profileWithShortName);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'googleuser1',
        })
      );
    });
  });

  describe('getUserOAuthProviders', () => {
    it('should return user OAuth providers', async () => {
      const mockProviders = [
        {
          id: 'provider1',
          provider_name: 'google',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/photo.jpg',
          createdAt: new Date(),
        },
      ];

      oauthProviderRepository.find.mockResolvedValue(mockProviders as any);

      const result = await service.getUserOAuthProviders(mockUser.id);

      expect(result).toEqual(mockProviders);
      expect(oauthProviderRepository.find).toHaveBeenCalledWith({
        where: { user_id: mockUser.id },
        select: ['id', 'provider_name', 'email', 'name', 'picture', 'createdAt'],
      });
    });
  });

  describe('unlinkOAuthProvider', () => {
    it('should unlink OAuth provider successfully', async () => {
      oauthProviderRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.unlinkOAuthProvider(mockUser.id, 'google');

      expect(oauthProviderRepository.delete).toHaveBeenCalledWith({
        user_id: mockUser.id,
        provider_name: 'google',
      });
    });

    it('should throw ConflictException when provider not linked', async () => {
      oauthProviderRepository.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(
        service.unlinkOAuthProvider(mockUser.id, 'google')
      ).rejects.toThrow(
        new ConflictException('google account is not linked to this user')
      );
    });
  });

  describe('generateUniqueUsername', () => {
    it('should sanitize display name for username', async () => {
      const service = new OAuthService(
        userRepository,
        oauthProviderRepository,
        jwtAuthService
      );

      userRepository.findOne.mockResolvedValue(null);

      const result = await (service as any).generateUniqueUsername(
        'John Doe!@#',
        'john@example.com',
        'google'
      );

      expect(result).toBe('johndoe');
    });

    it('should use email prefix when name is empty', async () => {
      const service = new OAuthService(
        userRepository,
        oauthProviderRepository,
        jwtAuthService
      );

      userRepository.findOne.mockResolvedValue(null);

      const result = await (service as any).generateUniqueUsername(
        '',
        'john@example.com',
        'google'
      );

      expect(result).toBe('john');
    });

    it('should use provider fallback for very short names', async () => {
      const service = new OAuthService(
        userRepository,
        oauthProviderRepository,
        jwtAuthService
      );

      userRepository.findOne.mockResolvedValue(null);

      const result = await (service as any).generateUniqueUsername(
        'ab',
        'a@b.com',
        'facebook'
      );

      expect(result).toBe('facebookuser');
    });
  });
});