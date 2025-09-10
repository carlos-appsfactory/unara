import {
  Injectable,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OAuthProvider } from '../entities/oauth-provider.entity';
import { JwtAuthService } from './jwt-auth.service';
import { TokenPair } from '../interfaces/jwt-payload.interface';

export interface OAuthProfile {
  providerId: string;
  provider: string;
  email?: string;
  name?: string;
  picture?: string;
  accessToken: string;
  refreshToken?: string;
}

export interface OAuthAuthenticationResult {
  user: User;
  tokens: TokenPair;
  isNewUser: boolean;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger('OAuthService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OAuthProvider)
    private readonly oauthProviderRepository: Repository<OAuthProvider>,
    private readonly jwtAuthService: JwtAuthService,
  ) {}

  /**
   * Authenticate or register user using OAuth profile
   * @param profile - OAuth profile from provider
   * @returns Authentication result with user data and tokens
   */
  async authenticateWithOAuth(profile: OAuthProfile): Promise<OAuthAuthenticationResult> {
    const { providerId, provider, email, name, picture } = profile;

    this.logger.log(
      `OAuth authentication attempt for ${provider} user: ${providerId}, email: ${email}`,
    );

    try {
      // First, check if this OAuth account is already linked to a user
      const existingOAuthProvider = await this.oauthProviderRepository.findOne({
        where: { provider_name: provider, provider_id: providerId },
        relations: ['user'],
      });

      if (existingOAuthProvider) {
        // OAuth account exists, authenticate the linked user
        const user = existingOAuthProvider.user;
        
        // Update last login
        user.last_login = new Date();
        await this.userRepository.save(user);

        // Generate JWT tokens
        const tokens = await this.jwtAuthService.generateTokens(user.id, user.email, user.username);

        this.logger.log(`OAuth authentication successful for existing user: ${user.id}`);

        return {
          user,
          tokens,
          isNewUser: false,
        };
      }

      // OAuth account doesn't exist, check if user exists by email
      let user: User;
      let isNewUser = false;

      if (email) {
        user = await this.userRepository.findOne({ where: { email } });
      }

      if (user) {
        // User exists with this email, link the OAuth account
        this.logger.log(`Linking OAuth account to existing user: ${user.id}`);
      } else {
        // Create new user account
        if (!email) {
          throw new UnauthorizedException(
            `Email is required for ${provider} authentication but was not provided`,
          );
        }

        const username = await this.generateUniqueUsername(name, email, provider);

        user = this.userRepository.create({
          email,
          username,
          password_hash: '', // OAuth users don't have passwords
          fullname: name || email.split('@')[0],
          email_verified: true, // OAuth emails are pre-verified
          last_login: new Date(),
          profile_picture: picture,
        });

        user = await this.userRepository.save(user);
        isNewUser = true;

        this.logger.log(`Created new user from OAuth: ${user.id}`);
      }

      // Create OAuth provider link
      const oauthProvider = this.oauthProviderRepository.create({
        user_id: user.id,
        provider_name: provider,
        provider_id: providerId,
        email: email,
        name: name,
        picture: picture,
      });

      await this.oauthProviderRepository.save(oauthProvider);

      // Update last login for existing users
      if (!isNewUser) {
        user.last_login = new Date();
        await this.userRepository.save(user);
      }

      // Generate JWT tokens
      const tokens = await this.jwtAuthService.generateTokens(user.id, user.email, user.username);

      this.logger.log(
        `OAuth authentication successful for ${isNewUser ? 'new' : 'existing'} user: ${user.id}`,
      );

      return {
        user,
        tokens,
        isNewUser,
      };
    } catch (error) {
      this.logger.error(
        `OAuth authentication failed for ${provider} user ${providerId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw error;
    }
  }

  /**
   * Generate a unique username for OAuth users
   * @param name - Display name from OAuth provider
   * @param email - Email address
   * @param provider - OAuth provider name
   * @returns Unique username
   */
  private async generateUniqueUsername(
    name: string | undefined,
    email: string,
    provider: string,
  ): Promise<string> {
    let baseUsername: string;

    if (name) {
      // Use display name, sanitized
      baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    } else {
      // Use email prefix
      baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    // Ensure minimum length
    if (baseUsername.length < 3) {
      baseUsername = `${provider}user`;
    }

    // Check if username is unique
    let username = baseUsername;
    let counter = 1;

    while (await this.userRepository.findOne({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  /**
   * Get OAuth providers for a user
   * @param userId - User ID
   * @returns List of linked OAuth providers
   */
  async getUserOAuthProviders(userId: string): Promise<OAuthProvider[]> {
    return this.oauthProviderRepository.find({
      where: { user_id: userId },
      select: ['id', 'provider_name', 'email', 'name', 'picture', 'createdAt'],
    });
  }

  /**
   * Unlink OAuth provider from user account
   * @param userId - User ID
   * @param provider - OAuth provider name
   */
  async unlinkOAuthProvider(userId: string, provider: string): Promise<void> {
    const result = await this.oauthProviderRepository.delete({
      user_id: userId,
      provider_name: provider,
    });

    if (result.affected === 0) {
      throw new ConflictException(`${provider} account is not linked to this user`);
    }

    this.logger.log(`Unlinked ${provider} OAuth provider for user: ${userId}`);
  }
}