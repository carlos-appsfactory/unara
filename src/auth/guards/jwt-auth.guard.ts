import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Determines if the request can be activated (authenticated)
   * @param context - The execution context
   * @returns boolean, Promise<boolean>, or Observable<boolean>
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Call the parent AuthGuard logic
    return super.canActivate(context);
  }

  /**
   * Handles request when authentication fails
   * Provides custom error messages for different failure scenarios
   * @param err - The error that occurred
   * @param user - The user object (if any)
   * @param info - Additional information about the failure
   * @param context - The execution context
   */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    // If there's an error or no user, authentication failed
    if (err || !user) {
      // Provide specific error messages based on the failure type
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token has expired');
      }
      
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid access token');
      }
      
      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('Access token not yet valid');
      }
      
      if (info?.message === 'No auth token') {
        throw new UnauthorizedException('Access token is required');
      }

      // Generic authentication failure
      throw new UnauthorizedException('Authentication failed');
    }

    // Authentication successful, return the user
    return user;
  }
}