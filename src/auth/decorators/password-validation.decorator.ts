import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments) {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // Minimum 8 characters
    if (password.length < 8) {
      return false;
    }

    // At least 1 uppercase letter
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // At least 1 lowercase letter
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // At least 1 number
    if (!/\d/.test(password)) {
      return false;
    }

    // At least 1 special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const password = args.value as string;
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      return 'Password must be a valid string';
    }

    if (password.length < 8) {
      errors.push('at least 8 characters');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('at least 1 uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('at least 1 lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('at least 1 number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('at least 1 special character');
    }

    if (errors.length === 0) {
      return 'Password does not meet strength requirements';
    }

    return `Password must contain ${errors.join(', ')}`;
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}