import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger('PasswordService');
  private readonly saltRounds = 12;

  async hashPassword(plainPassword: string): Promise<string> {
    try {
      if (!plainPassword) {
        throw new Error('Password cannot be empty');
      }

      const hashedPassword = await bcrypt.hash(plainPassword, this.saltRounds);
      return hashedPassword;
    } catch (error) {
      this.logger.error(`Error hashing password: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to hash password');
    }
  }

  async validatePassword(plainPassword: string, hash: string): Promise<boolean> {
    try {
      if (!plainPassword || !hash) {
        return false;
      }

      const isValid = await bcrypt.compare(plainPassword, hash);
      return isValid;
    } catch (error) {
      this.logger.error(`Error validating password: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to validate password');
    }
  }
}