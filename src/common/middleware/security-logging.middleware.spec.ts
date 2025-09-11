import { SecurityLoggingMiddleware } from './security-logging.middleware';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

describe('SecurityLoggingMiddleware', () => {
  let middleware: SecurityLoggingMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new SecurityLoggingMiddleware();
    
    mockRequest = {
      method: 'POST',
      originalUrl: '/api/auth/login',
      ip: '192.168.1.100',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: {},
    };

    mockResponse = {
      statusCode: 200,
      on: jest.fn(),
    };

    mockNext = jest.fn();
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Security Relevant Request Logging', () => {
    it('should log security-relevant requests', () => {
      const securityPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/forgot-password',
        '/api/auth/reset-password',
        '/api/auth/refresh',
        '/api/auth/logout',
      ];

      securityPaths.forEach(path => {
        mockRequest.originalUrl = path;
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining(`POST ${path} - IP: 192.168.1.100`)
        );
      });
    });

    it('should not log non-security requests', () => {
      mockRequest.originalUrl = '/api/users/profile';
      
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(loggerSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/users/profile')
      );
    });
  });

  describe('Bot Detection', () => {
    it('should detect potential bot activity', () => {
      const botUserAgents = [
        'bot/1.0',
        'crawler/2.0',
        'spider',
        'scraper',
        'curl/7.68.0',
        'wget/1.20.3',
        'python-requests/2.25.1',
        'PostmanRuntime/7.28.0',
      ];

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      botUserAgents.forEach(userAgent => {
        mockRequest.headers = { 'user-agent': userAgent };
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Potential bot activity detected')
        );
      });
    });

    it('should not flag legitimate user agents', () => {
      const legitimateUserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      ];

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      legitimateUserAgents.forEach(userAgent => {
        mockRequest.headers = { 'user-agent': userAgent };
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(warnSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Potential bot activity detected')
        );
      });
    });
  });

  describe('Injection Attempt Detection', () => {
    it('should detect SQL injection attempts in email field', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "admin'; DELETE FROM users; --",
      ];

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      mockRequest.originalUrl = '/api/auth/forgot-password';

      sqlInjectionAttempts.forEach(email => {
        mockRequest.body = { email };
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Potential injection attempt in email field')
        );
      });
    });

    it('should detect XSS attempts in token field', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '${alert("xss")}',
        '{{constructor.constructor("alert(1)")()}}',
      ];

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      mockRequest.originalUrl = '/api/auth/reset-password';

      xssAttempts.forEach(token => {
        mockRequest.body = { token };
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Potential injection attempt in token field')
        );
      });
    });

    it('should not flag legitimate inputs', () => {
      const legitimateInputs = [
        { path: '/api/auth/forgot-password', body: { email: 'user@example.com' } },
        { path: '/api/auth/reset-password', body: { token: 'abcd1234ef567890' } },
      ];

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      legitimateInputs.forEach(({ path, body }) => {
        mockRequest.originalUrl = path;
        mockRequest.body = body;
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(warnSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Potential injection attempt')
        );
      });
    });
  });

  describe('Suspicious Headers Detection', () => {
    it('should detect missing user agent', () => {
      mockRequest.headers = {};
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suspicious headers detected')
      );
    });

    it('should detect very short user agent', () => {
      mockRequest.headers = { 'user-agent': 'short' };
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suspicious headers detected')
      );
    });

    it('should detect excessive forwarded headers', () => {
      mockRequest.headers = {
        'x-forwarded-for': '1.1.1.1,2.2.2.2,3.3.3.3,4.4.4.4,5.5.5.5,6.6.6.6',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suspicious headers detected')
      );
    });
  });

  describe('Response Event Handling', () => {
    it('should log failed authentication attempts', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      let finishCallback: () => void;

      mockResponse.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });

      mockResponse.statusCode = 401;
      mockRequest.originalUrl = '/api/auth/login';

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger the finish event
      finishCallback!();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed POST /api/auth/login - Status: 401')
      );
    });

    it('should log rate limiting events', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      let finishCallback: () => void;

      mockResponse.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });

      mockResponse.statusCode = 429;

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger the finish event
      finishCallback!();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit exceeded')
      );
    });

    it('should log security violations', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      let finishCallback: () => void;

      mockResponse.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });

      mockResponse.statusCode = 403;

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger the finish event
      finishCallback!();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security violation')
      );
    });

    it('should call next middleware', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests without body', () => {
      mockRequest.body = undefined;
      
      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('should handle requests without headers', () => {
      mockRequest.headers = undefined;
      
      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('should handle non-string inputs in injection detection', () => {
      mockRequest.originalUrl = '/api/auth/forgot-password';
      mockRequest.body = { email: 123 }; // non-string
      
      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });
  });
});