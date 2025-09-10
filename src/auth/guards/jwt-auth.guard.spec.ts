import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockExecutionContext: Partial<ExecutionContext>;

  beforeEach(() => {
    guard = new JwtAuthGuard();
    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as ExecutionContext;
  });

  describe('handleRequest', () => {
    it('should return user when authentication is successful', () => {
      const mockUser = { id: '123', email: 'test@example.com' };

      const result = guard.handleRequest(
        null,
        mockUser,
        null,
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(mockUser);
    });

    it('should throw UnauthorizedException when token is expired', () => {
      expect(() => {
        guard.handleRequest(
          null,
          null,
          { name: 'TokenExpiredError' },
          mockExecutionContext as ExecutionContext,
        );
      }).toThrow(new UnauthorizedException('Access token has expired'));
    });

    it('should throw UnauthorizedException when token is invalid', () => {
      expect(() => {
        guard.handleRequest(
          null,
          null,
          { name: 'JsonWebTokenError' },
          mockExecutionContext as ExecutionContext,
        );
      }).toThrow(new UnauthorizedException('Invalid access token'));
    });

    it('should throw UnauthorizedException when token is not yet valid', () => {
      expect(() => {
        guard.handleRequest(
          null,
          null,
          { name: 'NotBeforeError' },
          mockExecutionContext as ExecutionContext,
        );
      }).toThrow(new UnauthorizedException('Access token not yet valid'));
    });

    it('should throw UnauthorizedException when no token is provided', () => {
      expect(() => {
        guard.handleRequest(
          null,
          null,
          { message: 'No auth token' },
          mockExecutionContext as ExecutionContext,
        );
      }).toThrow(new UnauthorizedException('Access token is required'));
    });

    it('should throw UnauthorizedException for generic authentication failure', () => {
      expect(() => {
        guard.handleRequest(
          null,
          null,
          null,
          mockExecutionContext as ExecutionContext,
        );
      }).toThrow(new UnauthorizedException('Authentication failed'));
    });

    it('should throw UnauthorizedException when there is an error', () => {
      const error = new Error('Some error');

      expect(() => {
        guard.handleRequest(
          error,
          { id: '123' },
          null,
          mockExecutionContext as ExecutionContext,
        );
      }).toThrow(new UnauthorizedException('Authentication failed'));
    });
  });
});
