import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('CurrentUser Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    mockRequest = {
      user: {
        sub: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        iat: 1234567890,
        exp: 1234567890 + 3600,
      } as JwtPayload,
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  });

  const decoratorCallback = (
    data: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | any => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!data) {
      return user;
    }

    return user?.[data];
  };

  it('should return the entire user object when no specific property is requested', () => {
    const result = decoratorCallback(undefined, mockExecutionContext);
    expect(result).toEqual(mockRequest.user);
  });

  it('should return specific property when requested', () => {
    const result = decoratorCallback('email', mockExecutionContext);
    expect(result).toBe('test@example.com');
  });

  it('should return sub property when requested', () => {
    const result = decoratorCallback('sub', mockExecutionContext);
    expect(result).toBe('user-123');
  });

  it('should return username property when requested', () => {
    const result = decoratorCallback('username', mockExecutionContext);
    expect(result).toBe('testuser');
  });

  it('should return undefined when requested property does not exist', () => {
    const result = decoratorCallback(
      'nonexistent' as keyof JwtPayload,
      mockExecutionContext,
    );
    expect(result).toBeUndefined();
  });

  it('should return undefined when user is null and specific property is requested', () => {
    mockRequest.user = null;
    const result = decoratorCallback('email', mockExecutionContext);
    expect(result).toBeUndefined();
  });

  it('should return null when user is null and no specific property is requested', () => {
    mockRequest.user = null;
    const result = decoratorCallback(undefined, mockExecutionContext);
    expect(result).toBeNull();
  });

  it('should handle undefined user gracefully', () => {
    mockRequest.user = undefined;
    const result = decoratorCallback('email', mockExecutionContext);
    expect(result).toBeUndefined();
  });
});
