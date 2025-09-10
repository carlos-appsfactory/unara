import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-microsoft';

export interface MicrosoftProfile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: Array<{
    type: string;
    value: string;
  }>;
  photos: Array<{
    value: string;
  }>;
  provider: string;
}

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('MICROSOFT_CLIENT_ID'),
      clientSecret: configService.get<string>('MICROSOFT_CLIENT_SECRET'),
      callbackURL: configService.get<string>('MICROSOFT_REDIRECT_URI', 'http://localhost:3000/auth/microsoft/callback'),
      scope: ['user.read'],
      tenant: 'common', // Allow both personal and work accounts
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: MicrosoftProfile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      // Extract user information from Microsoft profile
      const { id, displayName, emails, photos } = profile;
      
      const user = {
        providerId: id,
        provider: 'microsoft',
        email: emails?.[0]?.value || undefined,
        name: displayName,
        picture: photos?.[0]?.value || undefined,
        accessToken,
        refreshToken,
      };

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
}