import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { LoginAttempt } from '../entities/login-attempt.entity';

@Injectable()
export class LoginAttemptService {
  private readonly logger = new Logger('LoginAttemptService');

  // Configuration constants
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;
  private readonly CLEANUP_INTERVAL_HOURS = 24;

  constructor(
    @InjectRepository(LoginAttempt)
    private readonly loginAttemptRepository: Repository<LoginAttempt>,
  ) {}

  /**
   * Records a failed login attempt for the given identifier and IP
   * @param identifier - Email or username used in login attempt
   * @param ipAddress - IP address of the client
   */
  async recordFailedAttempt(
    identifier: string,
    ipAddress: string,
  ): Promise<void> {
    try {
      // Find existing login attempt record
      let loginAttempt = await this.loginAttemptRepository.findOne({
        where: { identifier, ip_address: ipAddress },
      });

      const now = new Date();

      if (loginAttempt) {
        // Check if account is currently blocked
        if (loginAttempt.blocked_until && loginAttempt.blocked_until > now) {
          // Extend block time if already blocked and still attempting
          loginAttempt.attempt_count += 1;
          loginAttempt.last_attempt = now;
          loginAttempt.blocked_until = new Date(
            now.getTime() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000,
          );
        } else {
          // Increment attempt count
          loginAttempt.attempt_count += 1;
          loginAttempt.last_attempt = now;

          // Block account if max attempts reached
          if (loginAttempt.attempt_count >= this.MAX_ATTEMPTS) {
            loginAttempt.blocked_until = new Date(
              now.getTime() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000,
            );

            this.logger.warn(
              `Account locked for identifier: ${identifier} from IP: ${ipAddress} after ${loginAttempt.attempt_count} failed attempts`,
            );
          }
        }

        await this.loginAttemptRepository.save(loginAttempt);
      } else {
        // Create new login attempt record
        loginAttempt = this.loginAttemptRepository.create({
          identifier,
          ip_address: ipAddress,
          attempt_count: 1,
          last_attempt: now,
          blocked_until: undefined,
        });

        await this.loginAttemptRepository.save(loginAttempt);
      }

      this.logger.log(
        `Recorded failed login attempt for ${identifier} from IP ${ipAddress}. Attempt count: ${loginAttempt.attempt_count}`,
      );
    } catch (error) {
      this.logger.error(
        `Error recording failed login attempt for ${identifier}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Checks if an account is currently locked due to too many failed attempts
   * @param identifier - Email or username to check
   * @param ipAddress - IP address to check
   * @returns Object with lock status and remaining time
   */
  async isAccountLocked(
    identifier: string,
    ipAddress: string,
  ): Promise<{
    isLocked: boolean;
    remainingLockTimeMinutes?: number;
    attemptCount?: number;
  }> {
    try {
      const loginAttempt = await this.loginAttemptRepository.findOne({
        where: { identifier, ip_address: ipAddress },
      });

      if (!loginAttempt) {
        return { isLocked: false };
      }

      const now = new Date();

      // Check if account is currently blocked
      if (loginAttempt.blocked_until && loginAttempt.blocked_until > now) {
        const remainingTime = Math.ceil(
          (loginAttempt.blocked_until.getTime() - now.getTime()) / (1000 * 60),
        );

        this.logger.warn(
          `Account access denied for ${identifier} from IP ${ipAddress}. Locked for ${remainingTime} more minutes.`,
        );

        return {
          isLocked: true,
          remainingLockTimeMinutes: remainingTime,
          attemptCount: loginAttempt.attempt_count,
        };
      }

      // Account not locked, but return attempt count for monitoring
      return {
        isLocked: false,
        attemptCount: loginAttempt.attempt_count,
      };
    } catch (error) {
      this.logger.error(
        `Error checking account lock status for ${identifier}: ${error.message}`,
        error.stack,
      );
      // On error, allow login attempt to proceed (fail open)
      return { isLocked: false };
    }
  }

  /**
   * Clears login attempts for a user after successful authentication
   * @param identifier - Email or username that successfully logged in
   * @param ipAddress - IP address of successful login
   */
  async clearSuccessfulAttempt(
    identifier: string,
    ipAddress: string,
  ): Promise<void> {
    try {
      const result = await this.loginAttemptRepository.delete({
        identifier,
        ip_address: ipAddress,
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(
          `Cleared login attempts for ${identifier} from IP ${ipAddress} after successful login`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error clearing login attempts for ${identifier}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Gets current attempt count for an identifier and IP
   * @param identifier - Email or username
   * @param ipAddress - IP address
   * @returns Current attempt count or 0 if no records
   */
  async getAttemptCount(
    identifier: string,
    ipAddress: string,
  ): Promise<number> {
    try {
      const loginAttempt = await this.loginAttemptRepository.findOne({
        where: { identifier, ip_address: ipAddress },
      });

      return loginAttempt?.attempt_count || 0;
    } catch (error) {
      this.logger.error(
        `Error getting attempt count for ${identifier}: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Cleanup old login attempt records
   * Should be called periodically to prevent database bloat
   */
  async cleanupOldAttempts(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - this.CLEANUP_INTERVAL_HOURS);

      const result = await this.loginAttemptRepository.delete({
        last_attempt: LessThan(cutoffDate),
        blocked_until: IsNull(), // Only delete unblocked attempts
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(
          `Cleaned up ${result.affected} old login attempt records`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error during login attempts cleanup: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get login attempt statistics for monitoring
   * @param identifier - Optional identifier to filter by
   * @returns Statistics about login attempts
   */
  async getStatistics(identifier?: string): Promise<{
    totalAttempts: number;
    blockedAccounts: number;
    averageAttemptsPerAccount: number;
  }> {
    try {
      const query = this.loginAttemptRepository.createQueryBuilder('la');

      if (identifier) {
        query.where('la.identifier = :identifier', { identifier });
      }

      const totalAttempts = await query.getCount();

      const blockedQuery = this.loginAttemptRepository
        .createQueryBuilder('la')
        .where('la.blocked_until > :now', { now: new Date() });

      if (identifier) {
        blockedQuery.andWhere('la.identifier = :identifier', { identifier });
      }

      const blockedAccounts = await blockedQuery.getCount();

      const avgResult = await this.loginAttemptRepository
        .createQueryBuilder('la')
        .select('AVG(la.attempt_count)', 'avg')
        .getRawOne();

      return {
        totalAttempts,
        blockedAccounts,
        averageAttemptsPerAccount: parseFloat(avgResult?.avg || '0'),
      };
    } catch (error) {
      this.logger.error(
        `Error getting login attempt statistics: ${error.message}`,
        error.stack,
      );
      return {
        totalAttempts: 0,
        blockedAccounts: 0,
        averageAttemptsPerAccount: 0,
      };
    }
  }
}
