import { Injectable, Logger } from '@nestjs/common';

/**
 * Service for managing blacklisted JWT access tokens
 * Uses in-memory storage for immediate token invalidation
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger('TokenBlacklistService');

  // In-memory storage for blacklisted token IDs (JTI)
  private readonly blacklistedTokens = new Set<string>();

  /**
   * Adds a token ID to the blacklist
   * @param jti - The JWT token ID (jti claim)
   */
  blacklistToken(jti: string): void {
    if (!jti) {
      this.logger.warn('Attempted to blacklist token with empty JTI');
      return;
    }

    this.blacklistedTokens.add(jti);
    this.logger.log(`Token ${jti} added to blacklist`);
  }

  /**
   * Checks if a token ID is blacklisted
   * @param jti - The JWT token ID to check
   * @returns true if token is blacklisted, false otherwise
   */
  isTokenBlacklisted(jti: string): boolean {
    if (!jti) {
      return false;
    }

    const isBlacklisted = this.blacklistedTokens.has(jti);
    
    if (isBlacklisted) {
      this.logger.log(`Blocked access for blacklisted token: ${jti}`);
    }

    return isBlacklisted;
  }

  /**
   * Removes expired tokens from the blacklist
   * Tokens are considered expired if they're older than the max JWT lifetime
   * @param maxAgeMinutes - Maximum age in minutes for tokens to remain in blacklist
   * @returns number of tokens removed from blacklist
   */
  cleanupExpiredBlacklistedTokens(maxAgeMinutes: number = 60): number {
    // Note: In a production environment, you would need to store token creation time
    // and implement proper cleanup. For this basic version, we'll provide a manual method.
    const initialSize = this.blacklistedTokens.size;
    
    // For a basic implementation, we'll clear all tokens periodically
    // In production, you'd want to store tokens with timestamps and clean selectively
    if (maxAgeMinutes <= 15) { // Only clear if cleanup is for very old tokens
      this.blacklistedTokens.clear();
      const removedCount = initialSize;
      
      if (removedCount > 0) {
        this.logger.log(`Cleared ${removedCount} blacklisted tokens from memory`);
      }
      
      return removedCount;
    }

    return 0;
  }

  /**
   * Gets the current count of blacklisted tokens
   * @returns number of blacklisted tokens
   */
  getBlacklistedTokenCount(): number {
    return this.blacklistedTokens.size;
  }

  /**
   * Clears all blacklisted tokens (use with caution)
   * Mainly for testing and emergency cleanup
   */
  clearAllBlacklistedTokens(): void {
    const count = this.blacklistedTokens.size;
    this.blacklistedTokens.clear();
    this.logger.warn(`Cleared all ${count} blacklisted tokens`);
  }
}