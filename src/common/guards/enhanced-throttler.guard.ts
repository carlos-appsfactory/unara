import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class EnhancedThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger('EnhancedThrottler');

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use IP address for tracking
    const ip = this.getClientIp(req);
    
    // For password reset endpoints, also consider email in the tracking key
    if (req.url?.includes('/auth/forgot-password') && req.body?.email) {
      return `${ip}-${req.body.email}`;
    }
    
    return ip;
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Skip throttling for health checks and monitoring endpoints
    const skipPaths = ['/health', '/metrics', '/api/health'];
    
    if (skipPaths.includes(request.url)) {
      return true;
    }

    return super.shouldSkip(context);
  }

  protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);
    
    // Enhanced logging for rate limiting events
    this.logger.warn(
      `Rate limit exceeded - URL: ${request.url} - Method: ${request.method} - IP: ${ip} - User-Agent: ${request.headers['user-agent'] || 'Unknown'}`
    );

    // Log additional context for password reset attempts
    if (request.url?.includes('/auth/forgot-password')) {
      this.logger.warn(
        `Password reset rate limit exceeded - IP: ${ip} - Email: ${request.body?.email || 'Unknown'}`
      );
    }

    if (request.url?.includes('/auth/reset-password')) {
      this.logger.warn(
        `Password reset attempt rate limit exceeded - IP: ${ip}`
      );
    }

    return super.throwThrottlingException(context);
  }

  private getClientIp(request: any): string {
    // Check various headers that might contain the real client IP
    const xForwardedFor = request.headers['x-forwarded-for'];
    const xRealIp = request.headers['x-real-ip'];
    const cfConnectingIp = request.headers['cf-connecting-ip']; // Cloudflare

    if (xForwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ips = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : xForwardedFor;
      return ips.split(',')[0].trim();
    }

    if (xRealIp) {
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    }

    if (cfConnectingIp) {
      return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
    }

    // Fallback to connection remote address
    return request.socket?.remoteAddress || request.ip || 'unknown';
  }
}