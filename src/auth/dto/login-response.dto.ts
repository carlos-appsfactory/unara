import { UserResponseDto } from './user-response.dto';
import { TokenPair } from '../interfaces/jwt-payload.interface';

export class LoginResponseDto {
  user: UserResponseDto;
  tokens: TokenPair;

  constructor(user: UserResponseDto, tokens: TokenPair) {
    this.user = user;
    this.tokens = tokens;
  }

  /**
   * Creates a LoginResponseDto from user entity and token pair
   * @param userEntity - The user entity from database
   * @param tokens - The JWT token pair (access & refresh)
   * @returns LoginResponseDto instance
   */
  static create(userEntity: any, tokens: TokenPair): LoginResponseDto {
    const userResponse = UserResponseDto.fromEntity(userEntity);
    return new LoginResponseDto(userResponse, tokens);
  }
}
