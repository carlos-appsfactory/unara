import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsStrongPassword } from '../../auth/decorators/password-validation.decorator';
import { IsEmailUnique } from '../../auth/validators/is-email-unique.validator';
import { IsUsernameUnique } from '../../auth/validators/is-username-unique.validator';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(255)
  @IsEmailUnique()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 30, { message: 'Username must be between 3 and 30 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  @IsUsernameUnique()
  username: string;

  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  password: string;
}
