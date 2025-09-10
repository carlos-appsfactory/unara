import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { User } from '../../users/entities/user.entity';

@ValidatorConstraint({ name: 'isUsernameUnique', async: true })
@Injectable()
export class IsUsernameUniqueConstraint
  implements ValidatorConstraintInterface
{
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async validate(username: string): Promise<boolean> {
    if (!username) {
      return true; // Let other validators handle required validation
    }

    const existingUser = await this.userRepository.findOne({
      where: { username },
    });

    return !existingUser; // Return true if user doesn't exist (username is unique)
  }

  defaultMessage(args: ValidationArguments): string {
    return `Username '${args.value}' is already taken`;
  }
}

export function IsUsernameUnique(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUsernameUniqueConstraint,
    });
  };
}
