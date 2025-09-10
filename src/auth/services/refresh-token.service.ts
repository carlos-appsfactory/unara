import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger('RefreshTokenService');

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Stores a refresh token in the database (hashed for security)
   * @param userId - The user's ID
   * @param tokenId - The unique token ID from JWT payload
   * @param expiresAt - When the token expires
   * @returns Promise<RefreshToken>
   */
  async storeRefreshToken(
    userId: string,
    tokenId: string,
    expiresAt: Date,
  ): Promise<RefreshToken> {
    try {
      // Hash the tokenId for secure storage
      const tokenHash = this.hashToken(tokenId);

      // Remove any existing refresh tokens for this user (token rotation)
      await this.revokeUserRefreshTokens(userId);

      const refreshToken = this.refreshTokenRepository.create({
        userId,
        tokenHash,
        expiresAt,
      });

      const savedToken = await this.refreshTokenRepository.save(refreshToken);
      
      this.logger.log(`Stored refresh token for user: ${userId}`);
      return savedToken;
    } catch (error) {
      this.logger.error(`Error storing refresh token for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Finds a refresh token by its hashed value
   * @param tokenId - The token ID to search for
   * @returns Promise<RefreshToken | null>
   */
  async findRefreshToken(tokenId: string): Promise<RefreshToken | null> {
    try {
      const tokenHash = this.hashToken(tokenId);
      
      const token = await this.refreshTokenRepository.findOne({
        where: { tokenHash },
        relations: ['user'],
      });

      return token;
    } catch (error) {
      this.logger.error(`Error finding refresh token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validates if a refresh token exists and is not expired
   * @param tokenId - The token ID to validate
   * @returns Promise<RefreshToken | null>
   */
  async validateRefreshToken(tokenId: string): Promise<RefreshToken | null> {
    try {
      const tokenHash = this.hashToken(tokenId);
      
      const token = await this.refreshTokenRepository.findOne({
        where: { tokenHash },
        relations: ['user'],
      });

      if (!token) {
        return null;
      }

      // Check if token is expired
      if (token.expiresAt < new Date()) {
        // Delete expired token
        await this.refreshTokenRepository.remove(token);
        this.logger.warn(`Removed expired refresh token for user: ${token.userId}`);
        return null;
      }

      return token;
    } catch (error) {
      this.logger.error(`Error validating refresh token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Revokes a specific refresh token
   * @param tokenId - The token ID to revoke
   * @returns Promise<boolean>
   */
  async revokeRefreshToken(tokenId: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(tokenId);
      
      const result = await this.refreshTokenRepository.delete({ tokenHash });
      
      const revoked = !!(result.affected && result.affected > 0);
      if (revoked) {
        this.logger.log(`Revoked refresh token: ${tokenHash.substring(0, 10)}...`);
      }
      
      return revoked;
    } catch (error) {
      this.logger.error(`Error revoking refresh token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Revokes all refresh tokens for a specific user
   * @param userId - The user's ID
   * @returns Promise<number> - Number of tokens revoked
   */
  async revokeUserRefreshTokens(userId: string): Promise<number> {
    try {
      const result = await this.refreshTokenRepository.delete({ userId });
      
      const revokedCount = result.affected || 0;
      if (revokedCount > 0) {
        this.logger.log(`Revoked ${revokedCount} refresh tokens for user: ${userId}`);
      }
      
      return revokedCount;
    } catch (error) {
      this.logger.error(`Error revoking user refresh tokens for ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cleans up expired refresh tokens from the database
   * @returns Promise<number> - Number of tokens cleaned up
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.refreshTokenRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      const cleanedCount = result.affected || 0;
      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} expired refresh tokens`);
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error(`Error cleaning up expired tokens: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Hashes a token for secure storage
   * @param token - The token to hash
   * @returns string - The hashed token
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}