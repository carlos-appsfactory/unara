import { validate } from 'class-validator';
import { IsStrongPassword, IsStrongPasswordConstraint } from './password-validation.decorator';
import { IsString, IsNotEmpty } from 'class-validator';

class TestPasswordDto {
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  password: string;
}

describe('IsStrongPassword Decorator', () => {
  let constraint: IsStrongPasswordConstraint;

  beforeEach(() => {
    constraint = new IsStrongPasswordConstraint();
  });

  describe('Password Strength Validation', () => {
    it('should accept strong password with all requirements', async () => {
      const dto = new TestPasswordDto();
      dto.password = 'StrongPass123!';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject password with less than 8 characters', async () => {
      const dto = new TestPasswordDto();
      dto.password = 'Short1!';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isStrongPassword).toContain('at least 8 characters');
    });

    it('should reject password without uppercase letter', async () => {
      const dto = new TestPasswordDto();
      dto.password = 'lowercase123!';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isStrongPassword).toContain('at least 1 uppercase letter');
    });

    it('should reject password without lowercase letter', async () => {
      const dto = new TestPasswordDto();
      dto.password = 'UPPERCASE123!';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isStrongPassword).toContain('at least 1 lowercase letter');
    });

    it('should reject password without number', async () => {
      const dto = new TestPasswordDto();
      dto.password = 'NoNumbers!';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isStrongPassword).toContain('at least 1 number');
    });

    it('should reject password without special character', async () => {
      const dto = new TestPasswordDto();
      dto.password = 'NoSpecial123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isStrongPassword).toContain('at least 1 special character');
    });

    it('should reject empty password', async () => {
      const dto = new TestPasswordDto();
      dto.password = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1); // Combined validation error
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
      expect(errors[0].constraints?.isStrongPassword).toBeDefined();
    });

    it('should reject null password', async () => {
      const dto = new TestPasswordDto();
      dto.password = null as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject undefined password', async () => {
      const dto = new TestPasswordDto();
      dto.password = undefined as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Violations', () => {
    it('should list all missing requirements in error message', async () => {
      const dto = new TestPasswordDto();
      dto.password = 'weak'; // Missing: length, uppercase, number, special char

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      const message = errors[0].constraints?.isStrongPassword;
      
      expect(message).toContain('at least 8 characters');
      expect(message).toContain('at least 1 uppercase letter');
      expect(message).toContain('at least 1 number');
      expect(message).toContain('at least 1 special character');
    });

    it('should handle password with only some requirements met', async () => {
      const dto = new TestPasswordDto();
      dto.password = 'Password'; // Missing: number, special char

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      const message = errors[0].constraints?.isStrongPassword;
      
      expect(message).toContain('at least 1 number');
      expect(message).toContain('at least 1 special character');
      expect(message).not.toContain('at least 8 characters');
      expect(message).not.toContain('uppercase letter');
      expect(message).not.toContain('lowercase letter');
    });
  });

  describe('Edge Cases', () => {
    it('should accept password with minimum requirements exactly', async () => {
      const dto = new TestPasswordDto();
      dto.password = 'Passw0rd!'; // Exactly 8 chars, 1 upper, 1 lower, 1 number, 1 special

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept password with multiple special characters', async () => {
      const dto = new TestPasswordDto();
      dto.password = 'StrongP@ssw0rd!#$';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept password with unicode characters and requirements', async () => {
      const dto = new TestPasswordDto();
      dto.password = 'Ströng密码123!';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle very long passwords', async () => {
      const dto = new TestPasswordDto();
      dto.password = 'A'.repeat(100) + 'b1!'; // Very long password with requirements

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Special Character Validation', () => {
    const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', ';', "'", ':', '"', '\\', '|', ',', '.', '<', '>', '/', '?'];

    specialChars.forEach(char => {
      it(`should accept password with special character: ${char}`, async () => {
        const dto = new TestPasswordDto();
        dto.password = `StrongPass123${char}`;

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('Constraint Direct Testing', () => {
    it('should validate strong password directly', () => {
      const isValid = constraint.validate('StrongPass123!', {} as any);
      expect(isValid).toBe(true);
    });

    it('should reject weak password directly', () => {
      const isValid = constraint.validate('weak', {} as any);
      expect(isValid).toBe(false);
    });

    it('should provide detailed error message for weak password', () => {
      const message = constraint.defaultMessage({ value: 'weak' } as any);
      expect(message).toContain('at least 8 characters');
      expect(message).toContain('at least 1 uppercase letter');
      expect(message).toContain('at least 1 number');
      expect(message).toContain('at least 1 special character');
    });

    it('should handle non-string input', () => {
      const isValid = constraint.validate(123 as any, {} as any);
      expect(isValid).toBe(false);
    });

    it('should provide appropriate message for non-string input', () => {
      const message = constraint.defaultMessage({ value: 123 } as any);
      expect(message).toBe('Password must be a valid string');
    });
  });
});