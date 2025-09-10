import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  JwtPayload,
  TokenPair,
  RefreshTokenPayload,
} from '../interfaces/jwt-payload.interface';
import { RefreshTokenService } from './refresh-token.service';
import * as crypto from 'crypto';

@Injectable()
export class JwtAuthService {
  private readonly logger = new Logger('JwtAuthService');
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {
    this.refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') || '';
    this.refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    if (!this.refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is required but not configured');
    }
  }

  /**
   * Generates both access and refresh tokens for a user
   * @param userId - The user's unique identifier
   * @param email - The user's email
   * @param username - The user's username
   * @returns Promise containing both tokens
   */
  async generateTokens(
    userId: string,
    email: string,
    username: string,
  ): Promise<TokenPair> {
    try {
      const tokenId = crypto.randomUUID();

      const payload: JwtPayload = {
        sub: userId,
        email,
        username,
      };

      const refreshPayload: RefreshTokenPayload = {
        sub: userId,
        tokenId,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload),
        this.jwtService.signAsync(refreshPayload, {
          secret: this.refreshSecret,
          expiresIn: this.refreshExpiresIn,
        }),
      ]);

      // Store refresh token in database with expiration
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await this.refreshTokenService.storeRefreshToken(
        userId,
        tokenId,
        expiresAt,
      );

      this.logger.log(`Generated tokens for user: ${userId}`);

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error(
        `Error generating tokens for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException(
        'Failed to generate authentication tokens',
      );
    }
  }

  /**
   * Validates and decodes an access token
   * @param token - The JWT access token to validate
   * @returns Promise containing the decoded payload
   */
  async validateToken(token: string): Promise<JwtPayload> {
    try {
      if (!token) {
        throw new UnauthorizedException('Token is required');
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (!payload || !payload.sub || !payload.email || !payload.username) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        this.logger.warn(`Access token expired: ${error.message}`);
        throw new UnauthorizedException('Access token expired');
      } else if (error.name === 'JsonWebTokenError') {
        this.logger.warn(`Invalid access token: ${error.message}`);
        throw new UnauthorizedException('Invalid access token');
      } else if (error instanceof UnauthorizedException) {
        throw error;
      } else {
        this.logger.error(
          `Error validating access token: ${error.message}`,
          error.stack,
        );
        throw new UnauthorizedException('Token validation failed');
      }
    }
  }

  /**
   * Validates a refresh token and generates new token pair
   * @param refreshToken - The JWT refresh token
   * @returns Promise containing new access and refresh tokens
   */
  async refreshTokens(
    refreshToken: string,
    email: string,
    username: string,
  ): Promise<TokenPair> {
    try {
      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token is required');
      }

      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.refreshSecret,
        },
      );

      if (!payload || !payload.sub || !payload.tokenId) {
        throw new UnauthorizedException('Invalid refresh token payload');
      }

      // Validate refresh token exists in database and is not expired
      const storedToken = await this.refreshTokenService.validateRefreshToken(
        payload.tokenId,
      );
      if (!storedToken) {
        throw new UnauthorizedException('Refresh token not found or expired');
      }

      // Verify the token belongs to the correct user
      if (storedToken.userId !== payload.sub) {
        throw new UnauthorizedException('Refresh token user mismatch');
      }

      // Generate new token pair with token rotation (this will revoke old tokens)
      const newTokens = await this.generateTokens(payload.sub, email, username);

      this.logger.log(`Refreshed tokens for user: ${payload.sub}`);

      return newTokens;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        this.logger.warn(`Refresh token expired: ${error.message}`);
        throw new UnauthorizedException('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        this.logger.warn(`Invalid refresh token: ${error.message}`);
        throw new UnauthorizedException('Invalid refresh token');
      } else if (error instanceof UnauthorizedException) {
        throw error;
      } else {
        this.logger.error(
          `Error refreshing tokens: ${error.message}`,
          error.stack,
        );
        throw new UnauthorizedException('Token refresh failed');
      }
    }
  }

  /**
   * Revokes a specific refresh token (logout)
   * @param refreshToken - The refresh token to revoke
   * @returns Promise<boolean>
   */
  async revokeRefreshToken(refreshToken: string): Promise<boolean> {
    try {
      if (!refreshToken) {
        return false;
      }

      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.refreshSecret,
        },
      );

      if (!payload || !payload.tokenId) {
        return false;
      }

      const revoked = await this.refreshTokenService.revokeRefreshToken(
        payload.tokenId,
      );

      if (revoked) {
        this.logger.log(`Revoked refresh token for user: ${payload.sub}`);
      }

      return revoked;
    } catch (error) {
      this.logger.warn(`Error revoking refresh token: ${error.message}`);
      return false;
    }
  }

  /**
   * Revokes all refresh tokens for a user (logout from all devices)
   * @param userId - The user's ID
   * @returns Promise<number>
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    try {
      const revokedCount =
        await this.refreshTokenService.revokeUserRefreshTokens(userId);

      if (revokedCount > 0) {
        this.logger.log(`Revoked all refresh tokens for user: ${userId}`);
      }

      return revokedCount;
    } catch (error) {
      this.logger.error(
        `Error revoking all tokens for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Decodes a token without verification (for debugging/logging purposes only)
   * @param token - The JWT token to decode
   * @returns The decoded payload or null if invalid
   */
  decodeToken(token: string): JwtPayload | RefreshTokenPayload | null {
    try {
      return this.jwtService.decode(token);
    } catch (error) {
      this.logger.warn(`Failed to decode token: ${error.message}`);
      return null;
    }
  }
}
