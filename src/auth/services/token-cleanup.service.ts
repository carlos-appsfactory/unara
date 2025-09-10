import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokenService } from './refresh-token.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { LoginAttemptService } from './login-attempt.service';

/**
 * Service for automated cleanup of expired tokens and old records
 */
@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger('TokenCleanupService');

  constructor(
    private readonly refreshTokenService: RefreshTokenService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly loginAttemptService: LoginAttemptService,
  ) {}

  /**
   * Runs every hour to clean up expired tokens and old records
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyCleanup(): Promise<void> {
    this.logger.log('Starting hourly token cleanup...');

    try {
      // Clean up expired refresh tokens
      const expiredRefreshTokens = await this.refreshTokenService.cleanupExpiredTokens();
      
      // Clean up old blacklisted access tokens (older than 2 hours)
      // Since access tokens typically expire in 15-60 minutes, 
      // blacklisted tokens older than 2 hours are safe to remove
      const expiredBlacklistedTokens = this.tokenBlacklistService.cleanupExpiredBlacklistedTokens(120);
      
      // Clean up old login attempts (older than 24 hours)
      await this.loginAttemptService.cleanupOldAttempts();
      const cleanedLoginAttempts = 0; // LoginAttemptService cleanup doesn't return count

      this.logger.log(
        `Hourly cleanup completed: ${expiredRefreshTokens} refresh tokens, ` +
        `${expiredBlacklistedTokens} blacklisted tokens, ` +
        `${cleanedLoginAttempts} login attempts cleaned`
      );
    } catch (error) {
      this.logger.error(
        `Error during hourly cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : ''
      );
    }
  }

  /**
   * Runs daily at midnight to perform comprehensive cleanup
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyCleanup(): Promise<void> {
    this.logger.log('Starting daily comprehensive cleanup...');

    try {
      // More aggressive cleanup for daily run
      
      // Clear all blacklisted tokens (they should be expired by now)
      const initialBlacklistCount = this.tokenBlacklistService.getBlacklistedTokenCount();
      if (initialBlacklistCount > 0) {
        this.tokenBlacklistService.clearAllBlacklistedTokens();
        this.logger.log(`Daily cleanup: cleared ${initialBlacklistCount} blacklisted tokens`);
      }

      // Clean up very old login attempts (older than 7 days)  
      await this.loginAttemptService.cleanupOldAttempts();
      const oldLoginAttempts = 0; // LoginAttemptService cleanup doesn't return count
      
      this.logger.log(
        `Daily cleanup completed: ${initialBlacklistCount} blacklisted tokens, ` +
        `${oldLoginAttempts} old login attempts cleaned`
      );
    } catch (error) {
      this.logger.error(
        `Error during daily cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : ''
      );
    }
  }

  /**
   * Manual cleanup method for immediate token cleanup
   * Can be called programmatically when needed
   */
  async performManualCleanup(): Promise<{
    refreshTokens: number;
    blacklistedTokens: number;
    loginAttempts: number;
  }> {
    this.logger.log('Performing manual token cleanup...');

    try {
      const refreshTokens = await this.refreshTokenService.cleanupExpiredTokens();
      const blacklistedTokens = this.tokenBlacklistService.cleanupExpiredBlacklistedTokens(60);
      await this.loginAttemptService.cleanupOldAttempts();
      const loginAttempts = 0; // LoginAttemptService cleanup doesn't return count

      this.logger.log(
        `Manual cleanup completed: ${refreshTokens} refresh tokens, ` +
        `${blacklistedTokens} blacklisted tokens, ` +
        `${loginAttempts} login attempts cleaned`
      );

      return {
        refreshTokens,
        blacklistedTokens,
        loginAttempts,
      };
    } catch (error) {
      this.logger.error(
        `Error during manual cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : ''
      );
      throw error;
    }
  }
}