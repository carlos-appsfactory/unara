import { UserResponseDto } from './user-response.dto';

export class OAuthLoginResponseDto {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
  provider: string;
  isNewUser: boolean;
}