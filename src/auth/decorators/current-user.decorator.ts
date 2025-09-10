import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Parameter decorator to extract the current authenticated user from the request
 *
 * Usage examples:
 *
 * // Get the full user payload
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: JwtPayload) {
 *   return user;
 * }
 *
 * // Get a specific property from the user
 * @Get('user-id')
 * @UseGuards(JwtAuthGuard)
 * getUserId(@CurrentUser('sub') userId: string) {
 *   return { userId };
 * }
 *
 * // With optional authentication
 * @Get('optional-profile')
 * @UseGuards(OptionalJwtAuthGuard)
 * getOptionalProfile(@CurrentUser() user?: JwtPayload) {
 *   return user || { message: 'Not authenticated' };
 * }
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | any => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    // If no specific property is requested, return the entire user object
    if (!data) {
      return user;
    }

    // Return the specific property if it exists
    return user?.[data];
  },
);
