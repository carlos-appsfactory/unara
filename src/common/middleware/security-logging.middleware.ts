import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('SecurityLogging');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers = {} } = req;
    const userAgent = headers['user-agent'] || 'Unknown';

    // Log security-relevant requests
    if (this.isSecurityRelevantRequest(originalUrl)) {
      this.logger.log(
        `${method} ${originalUrl} - IP: ${ip} - User-Agent: ${userAgent}`
      );
    }

    // Monitor for suspicious patterns
    this.detectSuspiciousActivity(req);

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      // Log failed authentication attempts
      if (this.isAuthenticationRequest(originalUrl) && statusCode >= 400) {
        this.logger.warn(
          `Failed ${method} ${originalUrl} - Status: ${statusCode} - IP: ${ip} - Duration: ${duration}ms`
        );
      }

      // Log rate limiting events
      if (statusCode === 429) {
        this.logger.warn(
          `Rate limit exceeded - ${method} ${originalUrl} - IP: ${ip} - User-Agent: ${userAgent}`
        );
      }

      // Log security header violations
      if (statusCode === 403) {
        this.logger.warn(
          `Security violation - ${method} ${originalUrl} - Status: ${statusCode} - IP: ${ip}`
        );
      }
    });

    next();
  }

  private isSecurityRelevantRequest(url: string): boolean {
    const securityPaths = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/refresh',
      '/auth/logout',
    ];

    return securityPaths.some(path => url.includes(path));
  }

  private isAuthenticationRequest(url: string): boolean {
    const authPaths = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
    ];

    return authPaths.some(path => url.includes(path));
  }

  private detectSuspiciousActivity(req: Request): void {
    const { ip, headers = {}, body } = req;
    const userAgent = headers['user-agent'] || '';

    // Detect potential bot activity
    if (this.isPotentialBot(userAgent)) {
      this.logger.warn(`Potential bot activity detected - IP: ${ip} - User-Agent: ${userAgent}`);
    }

    // Detect suspicious request patterns
    if (this.hasSuspiciousHeaders(headers)) {
      this.logger.warn(`Suspicious headers detected - IP: ${ip}`);
    }

    // Detect potential injection attempts in password reset
    if (req.originalUrl.includes('/auth/forgot-password') && body?.email) {
      if (this.hasInjectionAttempt(body.email)) {
        this.logger.warn(`Potential injection attempt in email field - IP: ${ip} - Email: ${body.email}`);
      }
    }

    // Detect potential injection attempts in reset password
    if (req.originalUrl.includes('/auth/reset-password') && body?.token) {
      if (this.hasInjectionAttempt(body.token)) {
        this.logger.warn(`Potential injection attempt in token field - IP: ${ip}`);
      }
    }
  }

  private isPotentialBot(userAgent: string): boolean {
    const botIndicators = [
      'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests',
      'postman', 'insomnia', 'httpclient', 'okhttp', 'apache-httpclient'
    ];

    const lowerUserAgent = userAgent.toLowerCase();
    return botIndicators.some(indicator => lowerUserAgent.includes(indicator));
  }

  private hasSuspiciousHeaders(headers: any): boolean {
    // Check for missing or suspicious User-Agent
    if (!headers['user-agent'] || headers['user-agent'].length < 10) {
      return true;
    }

    // Check for suspicious X-Forwarded headers that might indicate proxying
    const suspiciousForwarded = headers['x-forwarded-for'];
    if (suspiciousForwarded && suspiciousForwarded.split(',').length > 5) {
      return true;
    }

    return false;
  }

  private hasInjectionAttempt(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    const injectionPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+set/i,
      /exec\s*\(/i,
      /eval\s*\(/i,
      /\${.*}/,
      /\{\{.*\}\}/,
    ];

    return injectionPatterns.some(pattern => pattern.test(input));
  }
}