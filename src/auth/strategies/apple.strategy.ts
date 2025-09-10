import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AppleTokenPayload {
  iss: string; // Apple issuer
  aud: string; // Your app's client ID
  exp: number; // Expiration time
  iat: number; // Issued at time
  sub: string; // Apple user ID
  email?: string; // User's email (optional)
  email_verified?: boolean; // Email verification status
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async validate(req: Request): Promise<any> {
    try {
      // Apple Sign-In uses server-side JWT token validation
      const { id_token } = req.body;
      
      if (!id_token) {
        throw new UnauthorizedException('Apple ID token is required');
      }

      // Decode the JWT token without verification first to get the header
      const decodedHeader = jwt.decode(id_token, { complete: true });
      
      if (!decodedHeader) {
        throw new UnauthorizedException('Invalid Apple ID token format');
      }

      // In a production environment, you would:
      // 1. Fetch Apple's public keys from https://appleid.apple.com/auth/keys
      // 2. Verify the token signature using the appropriate key
      // 3. Validate the token claims (iss, aud, exp, etc.)
      
      // For now, we'll decode the payload (this should be replaced with proper verification)
      const payload = jwt.decode(id_token) as AppleTokenPayload;
      
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Invalid Apple ID token payload');
      }

      // Validate basic claims
      if (payload.iss !== 'https://appleid.apple.com') {
        throw new UnauthorizedException('Invalid Apple token issuer');
      }

      if (payload.aud !== this.configService.get<string>('APPLE_CLIENT_ID')) {
        throw new UnauthorizedException('Invalid Apple token audience');
      }

      if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException('Apple token has expired');
      }

      const user = {
        providerId: payload.sub,
        provider: 'apple',
        email: payload.email || undefined,
        name: undefined, // Apple doesn't always provide name in JWT
        picture: undefined, // Apple doesn't provide profile pictures
        accessToken: id_token,
        refreshToken: undefined,
      };

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Apple authentication failed');
    }
  }
}