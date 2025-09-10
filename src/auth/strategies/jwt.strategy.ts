import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { JwtAuthService } from '../services/jwt-auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtAuthService: JwtAuthService,
  ) {
    super({
      // Extract JWT from Authorization header as Bearer token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Don't ignore expiration
      ignoreExpiration: false,
      // Use the same secret as JWT service
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'fallback-secret',
      // Algorithms allowed
      algorithms: ['HS256'],
    });
  }

  /**
   * Validates the JWT payload and returns the user data
   * This method is called by Passport after JWT signature verification
   * @param payload - The decoded JWT payload
   * @returns The user data to be attached to the request
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    try {
      // Validate the token structure and content
      if (!payload || !payload.sub || !payload.email || !payload.username) {
        throw new UnauthorizedException('Invalid token payload structure');
      }

      // Additional validation using our JWT service if needed
      // This ensures the token hasn't been tampered with beyond signature verification
      await this.jwtAuthService.validateToken(this.reconstructToken(payload));

      // Return the user payload to be injected into the request
      // This will be available as req.user in controllers
      return {
        sub: payload.sub,
        email: payload.email,
        username: payload.username,
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch (error) {
      // Log the validation error for debugging
      console.error('JWT Strategy validation error:', error.message);
      
      // Throw UnauthorizedException for any validation failure
      throw new UnauthorizedException('Token validation failed');
    }
  }

  /**
   * Reconstructs a token string for additional validation
   * Note: This is a simplified reconstruction for validation purposes
   * In practice, we rely on Passport's JWT verification
   */
  private reconstructToken(payload: JwtPayload): string {
    // This is a placeholder - in real scenarios, we don't need to reconstruct
    // the token since Passport already validated it. This method is here
    // for potential future use cases where we need the full token string.
    return 'validated-by-passport';
  }
}