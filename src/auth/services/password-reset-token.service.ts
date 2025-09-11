import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class PasswordResetTokenService {
  private readonly logger = new Logger('PasswordResetTokenService');
  private readonly TOKEN_EXPIRY_MINUTES = 15; // 15 minutes for security
  private readonly TOKEN_LENGTH = 32; // 32 bytes = 256 bits

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Generates and stores a secure password reset token for a user
   * @param userId - The user's ID
   * @returns Promise containing the plain text token (for email sending)
   */
  async generatePasswordResetToken(userId: string): Promise<string> {
    try {
      // Verify user exists
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'email'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Invalidate any existing unused tokens for this user
      await this.invalidateExistingTokens(userId);

      // Generate secure random token
      const tokenBuffer = randomBytes(this.TOKEN_LENGTH);
      const plainTextToken = tokenBuffer.toString('hex');

      // Hash the token for secure storage
      const tokenHash = this.hashToken(plainTextToken);

      // Calculate expiration time (15 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.TOKEN_EXPIRY_MINUTES);

      // Create and save the password reset token
      const passwordResetToken = this.passwordResetTokenRepository.create({
        userId,
        tokenHash,
        expiresAt,
        usedAt: null,
      });

      await this.passwordResetTokenRepository.save(passwordResetToken);

      this.logger.log(`Password reset token generated for user: ${userId}`);
      
      // Return plain text token for email sending
      return plainTextToken;
    } catch (error) {
      this.logger.error(
        `Failed to generate password reset token for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validates a password reset token and returns the associated user
   * @param token - The plain text token from the reset link
   * @returns Promise containing the user if token is valid, null otherwise
   */
  async validatePasswordResetToken(token: string): Promise<User | null> {
    try {
      if (!token || token.trim().length === 0) {
        throw new BadRequestException('Password reset token is required');
      }

      // Hash the provided token for comparison
      const tokenHash = this.hashToken(token);

      // Find the token record
      const passwordResetToken = await this.passwordResetTokenRepository.findOne({
        where: { tokenHash },
        relations: ['user'],
      });

      if (!passwordResetToken) {
        this.logger.warn(`Invalid password reset token attempted: ${token.substring(0, 8)}...`);
        return null;
      }

      // Check if token is valid (not expired and not used)
      if (!passwordResetToken.isValid()) {
        this.logger.warn(
          `Invalid password reset token attempted for user: ${passwordResetToken.userId} - ` +
          `Expired: ${passwordResetToken.isExpired()}, Used: ${passwordResetToken.isUsed()}`
        );
        return null;
      }

      this.logger.log(`Valid password reset token validated for user: ${passwordResetToken.userId}`);
      return passwordResetToken.user;
    } catch (error) {
      this.logger.error(
        `Error validating password reset token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Marks a password reset token as used
   * @param token - The plain text token
   * @returns Promise that resolves when token is marked as used
   */
  async markTokenAsUsed(token: string): Promise<void> {
    try {
      const tokenHash = this.hashToken(token);

      const passwordResetToken = await this.passwordResetTokenRepository.findOne({
        where: { tokenHash },
      });

      if (!passwordResetToken) {
        throw new NotFoundException('Password reset token not found');
      }

      // Mark as used
      passwordResetToken.markAsUsed();
      await this.passwordResetTokenRepository.save(passwordResetToken);

      this.logger.log(`Password reset token marked as used for user: ${passwordResetToken.userId}`);
    } catch (error) {
      this.logger.error(
        `Error marking password reset token as used: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Invalidates all existing unused password reset tokens for a user
   * @param userId - The user's ID
   * @returns Promise containing the number of tokens invalidated
   */
  async invalidateExistingTokens(userId: string): Promise<number> {
    try {
      // Mark all unused tokens as used (effectively invalidating them)
      const result = await this.passwordResetTokenRepository
        .createQueryBuilder()
        .update(PasswordResetToken)
        .set({ usedAt: new Date() })
        .where('userId = :userId', { userId })
        .andWhere('usedAt IS NULL')
        .execute();

      const invalidatedCount = result.affected || 0;

      if (invalidatedCount > 0) {
        this.logger.log(`Invalidated ${invalidatedCount} existing tokens for user: ${userId}`);
      }

      return invalidatedCount;
    } catch (error) {
      this.logger.error(
        `Error invalidating existing tokens for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cleans up expired password reset tokens from the database
   * @returns Promise containing the number of tokens cleaned up
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.passwordResetTokenRepository
        .createQueryBuilder()
        .delete()
        .from(PasswordResetToken)
        .where('expiresAt < :now', { now: new Date() })
        .execute();

      const cleanedCount = result.affected || 0;

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} expired password reset tokens`);
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error(
        `Error cleaning up expired password reset tokens: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Gets the count of valid (unused and not expired) tokens for a user
   * @param userId - The user's ID
   * @returns Promise containing the count of valid tokens
   */
  async getValidTokenCountForUser(userId: string): Promise<number> {
    try {
      const count = await this.passwordResetTokenRepository
        .createQueryBuilder()
        .where('userId = :userId', { userId })
        .andWhere('usedAt IS NULL')
        .andWhere('expiresAt > :now', { now: new Date() })
        .getCount();

      return count;
    } catch (error) {
      this.logger.error(
        `Error getting valid token count for user ${userId}: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Hashes a token using SHA256 for secure storage
   * @param token - The plain text token
   * @returns The hashed token
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}