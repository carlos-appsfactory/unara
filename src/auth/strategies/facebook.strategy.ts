import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-facebook';

export interface FacebookProfile {
  id: string;
  username?: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
    middleName?: string;
  };
  emails: Array<{
    value: string;
  }>;
  photos: Array<{
    value: string;
  }>;
  provider: string;
}

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID'),
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET'),
      callbackURL: configService.get<string>('FACEBOOK_REDIRECT_URI', 'http://localhost:3000/auth/facebook/callback'),
      scope: ['email'],
      profileFields: ['id', 'displayName', 'name', 'emails', 'photos'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: FacebookProfile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      // Extract user information from Facebook profile
      const { id, displayName, emails, photos } = profile;
      
      const user = {
        providerId: id,
        provider: 'facebook',
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