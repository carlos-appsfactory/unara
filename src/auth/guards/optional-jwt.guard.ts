import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Determines if the request can be activated
   * This guard allows both authenticated and unauthenticated requests
   * @param context - The execution context
   * @returns boolean, Promise<boolean>, or Observable<boolean>
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Always allow the request to proceed
    // Authentication will be attempted but not required
    return super.canActivate(context);
  }

  /**
   * Handles request regardless of authentication success or failure
   * Injects user data when available, allows null when not authenticated
   * @param err - The error that occurred
   * @param user - The user object (if any)
   * @param info - Additional information about the authentication attempt
   * @param context - The execution context
   */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    // If authentication was successful, return the user
    if (user) {
      return user;
    }

    // If authentication failed, return null (no user) as TUser
    // This allows the request to continue without authentication
    // Controllers can check if req.user exists to determine authentication status
    return null as TUser;
  }
}