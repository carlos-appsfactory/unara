import { ExecutionContext } from '@nestjs/common';
import { OptionalJwtAuthGuard } from './optional-jwt.guard';

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalJwtAuthGuard;
  let mockExecutionContext: Partial<ExecutionContext>;

  beforeEach(() => {
    guard = new OptionalJwtAuthGuard();
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

    it('should return null when authentication fails but not throw error', () => {
      const result = guard.handleRequest(
        null,
        null,
        { name: 'TokenExpiredError' },
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBeNull();
    });

    it('should return null when no token is provided', () => {
      const result = guard.handleRequest(
        null,
        null,
        { message: 'No auth token' },
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBeNull();
    });

    it('should return null when there is an authentication error', () => {
      const error = new Error('Some error');
      
      const result = guard.handleRequest(
        error,
        null,
        null,
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBeNull();
    });

    it('should return null for invalid token but allow request to continue', () => {
      const result = guard.handleRequest(
        null,
        null,
        { name: 'JsonWebTokenError' },
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBeNull();
    });
  });
});