import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class VerifyEmailDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  token: string;
}

export class ResendVerificationDto {
  @IsNotEmpty()
  @IsString()
  email: string;
}

export class VerificationResponseDto {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    username: string;
    email_verified: boolean;
  };
}
