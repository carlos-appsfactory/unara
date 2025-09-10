import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger('EmailVerificationService');
  private readonly TOKEN_EXPIRY_HOURS = 24;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Generates and stores an email verification token for a user
   * @param userId - The user's ID
   * @returns Promise containing the verification token
   */
  async generateVerificationToken(userId: string): Promise<string> {
    try {
      // Generate secure random token
      const token = randomUUID();

      // Calculate expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

      // Update user with verification token
      await this.userRepository.update(userId, {
        email_verification_token: token,
        email_verification_expires_at: expiresAt,
      });

      this.logger.log(`Verification token generated for user: ${userId}`);
      return token;
    } catch (error) {
      this.logger.error(
        `Failed to generate verification token for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verifies an email verification token and marks the user as verified
   * @param token - The verification token
   * @returns Promise containing the verified user or null if invalid
   */
  async verifyEmailToken(token: string): Promise<User | null> {
    try {
      if (!token) {
        throw new BadRequestException('Verification token is required');
      }

      // Find user by verification token
      const user = await this.userRepository.findOne({
        where: { email_verification_token: token },
      });

      if (!user) {
        this.logger.warn(`Invalid verification token attempted: ${token}`);
        return null;
      }

      // Check if token has expired
      if (
        user.email_verification_expires_at &&
        user.email_verification_expires_at < new Date()
      ) {
        this.logger.warn(
          `Expired verification token attempted: ${token} for user: ${user.id}`,
        );

        // Clear expired token
        await this.userRepository.update(user.id, {
          email_verification_token: null,
          email_verification_expires_at: null,
        });

        return null;
      }

      // Check if email is already verified
      if (user.email_verified) {
        this.logger.info(`Email already verified for user: ${user.id}`);

        // Clear token since verification is already complete
        await this.userRepository.update(user.id, {
          email_verification_token: null,
          email_verification_expires_at: null,
        });

        return user;
      }

      // Mark email as verified and clear token
      await this.userRepository.update(user.id, {
        email_verified: true,
        email_verification_token: null,
        email_verification_expires_at: null,
      });

      // Fetch updated user
      const verifiedUser = await this.userRepository.findOne({
        where: { id: user.id },
      });

      this.logger.log(`Email verified successfully for user: ${user.id}`);
      return verifiedUser;
    } catch (error) {
      this.logger.error(
        `Error verifying email token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Resends verification token for a user by email
   * @param email - The user's email address
   * @returns Promise containing the new verification token
   */
  async resendVerificationToken(email: string): Promise<string> {
    try {
      if (!email) {
        throw new BadRequestException('Email is required');
      }

      // Find user by email
      const user = await this.userRepository.findOne({
        where: { email },
      });

      if (!user) {
        // Don't reveal if email exists or not for security
        this.logger.warn(
          `Verification resend attempted for non-existent email: ${email}`,
        );
        throw new NotFoundException(
          'If this email is registered, a verification email will be sent',
        );
      }

      // Check if email is already verified
      if (user.email_verified) {
        this.logger.info(
          `Verification resend attempted for already verified email: ${email}`,
        );
        throw new BadRequestException('Email is already verified');
      }

      // Generate new verification token
      const token = await this.generateVerificationToken(user.id);

      this.logger.log(`Verification token resent for user: ${user.id}`);
      return token;
    } catch (error) {
      this.logger.error(
        `Error resending verification token for ${email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Clears expired verification tokens (cleanup utility)
   * @returns Promise containing the number of tokens cleared
   */
  async clearExpiredTokens(): Promise<number> {
    try {
      const result = await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({
          email_verification_token: null,
          email_verification_expires_at: null,
        })
        .where('email_verification_expires_at < :now', { now: new Date() })
        .andWhere('email_verification_token IS NOT NULL')
        .execute();

      const clearedCount = result.affected || 0;

      if (clearedCount > 0) {
        this.logger.log(`Cleared ${clearedCount} expired verification tokens`);
      }

      return clearedCount;
    } catch (error) {
      this.logger.error(
        `Error clearing expired verification tokens: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Checks if a user has a valid verification token
   * @param userId - The user's ID
   * @returns Promise containing boolean indicating if token exists and is valid
   */
  async hasValidVerificationToken(userId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['email_verification_token', 'email_verification_expires_at'],
      });

      if (
        !user ||
        !user.email_verification_token ||
        !user.email_verification_expires_at
      ) {
        return false;
      }

      return user.email_verification_expires_at > new Date();
    } catch (error) {
      this.logger.error(
        `Error checking verification token for user ${userId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
}
