import { IsNotEmpty, IsString, MinLength, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token from email',
    example: 'abc123def456...',
  })
  @IsNotEmpty({ message: 'Reset token is required' })
  @IsString({ message: 'Reset token must be a string' })
  @MaxLength(128, { message: 'Token is too long' })
  @Matches(/^[a-zA-Z0-9]+$/, { message: 'Token contains invalid characters' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  token: string;

  @ApiProperty({
    description: 'New password for the user account',
    example: 'NewSecurePass123!',
    minLength: 8,
  })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/,
    {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }
  )
  newPassword: string;
}