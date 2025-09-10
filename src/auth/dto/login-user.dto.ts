import { IsNotEmpty, IsString, IsEmail, ValidateIf } from 'class-validator';

export class LoginUserDto {
  @ValidateIf((o) => !o.username)
  @IsNotEmpty({ message: 'Email is required when username is not provided' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsNotEmpty({ message: 'Username is required when email is not provided' })
  @IsString({ message: 'Username must be a string' })
  username?: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  password: string;

  /**
   * Gets the identifier (email or username) for authentication
   * @returns The email or username value
   */
  getIdentifier(): string {
    return this.email || this.username || '';
  }

  /**
   * Validates that either email or username is provided
   * @returns boolean indicating if at least one identifier is present
   */
  hasIdentifier(): boolean {
    return !!(this.email || this.username);
  }
}
