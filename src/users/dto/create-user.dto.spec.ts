import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  let dto: CreateUserDto;

  beforeEach(() => {
    dto = new CreateUserDto();
    dto.fullname = 'John Doe';
    dto.email = 'john@example.com';
    dto.username = 'johndoe';
    dto.password = 'StrongPass123!';
  });

  describe('Valid DTO', () => {
    it('should pass validation with all valid fields', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with optional profile_picture', async () => {
      dto.profile_picture = 'https://example.com/avatar.jpg';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation without optional profile_picture', async () => {
      delete dto.profile_picture;
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Fullname Validation', () => {
    it('should reject empty fullname', async () => {
      dto.fullname = '';
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('fullname');
    });

    it('should reject null fullname', async () => {
      dto.fullname = null as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'fullname')).toBe(true);
    });

    it('should reject fullname longer than 255 characters', async () => {
      dto.fullname = 'a'.repeat(256);
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('fullname');
    });

    it('should accept fullname exactly 255 characters', async () => {
      dto.fullname = 'a'.repeat(255);
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'fullname')).toHaveLength(0);
    });
  });

  describe('Email Validation', () => {
    it('should reject invalid email format', async () => {
      dto.email = 'invalid-email';
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
    });

    it('should reject empty email', async () => {
      dto.email = '';
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
    });

    it('should reject email longer than 255 characters', async () => {
      dto.email = 'a'.repeat(250) + '@test.com'; // Over 255 chars
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
    });

    it('should accept various valid email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.co.uk',
        'user+tag@example.org',
        '123@example.com',
        'test@sub.example.com'
      ];

      for (const email of validEmails) {
        dto.email = email;
        const errors = await validate(dto);
        expect(errors.filter(e => e.property === 'email')).toHaveLength(0);
      }
    });
  });

  describe('Username Validation', () => {
    it('should reject empty username', async () => {
      dto.username = '';
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('username');
    });

    it('should reject username longer than 255 characters', async () => {
      dto.username = 'a'.repeat(256);
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('username');
    });

    it('should accept username exactly 255 characters', async () => {
      dto.username = 'a'.repeat(255);
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'username')).toHaveLength(0);
    });

    it('should accept usernames with various characters', async () => {
      const validUsernames = [
        'user123',
        'user_name',
        'user.name',
        'user-name',
        'USERNAME'
      ];

      for (const username of validUsernames) {
        dto.username = username;
        const errors = await validate(dto);
        expect(errors.filter(e => e.property === 'username')).toHaveLength(0);
      }
    });
  });

  describe('Password Validation (Strong Password)', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'weak',
        'password',
        'Password',
        'password123',
        'PASSWORD123',
        'Password123'
      ];

      for (const password of weakPasswords) {
        dto.password = password;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.property === 'password')).toBe(true);
      }
    });

    it('should accept strong passwords', async () => {
      const strongPasswords = [
        'StrongPass123!',
        'MyP@ssw0rd',
        'Secure123#',
        'Complex$Pass1',
        'Valid8Password!'
      ];

      for (const password of strongPasswords) {
        dto.password = password;
        const errors = await validate(dto);
        expect(errors.filter(e => e.property === 'password')).toHaveLength(0);
      }
    });

    it('should provide detailed error message for weak password', async () => {
      dto.password = 'weak';
      const errors = await validate(dto);
      
      const passwordError = errors.find(e => e.property === 'password');
      expect(passwordError).toBeDefined();
      
      const message = passwordError?.constraints?.isStrongPassword;
      expect(message).toContain('at least 8 characters');
      expect(message).toContain('at least 1 uppercase letter');
      expect(message).toContain('at least 1 number');
      expect(message).toContain('at least 1 special character');
    });

    it('should reject empty password', async () => {
      dto.password = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'password')).toBe(true);
    });
  });

  describe('Profile Picture Validation', () => {
    it('should accept valid profile picture URL', async () => {
      dto.profile_picture = 'https://example.com/avatar.jpg';
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'profile_picture')).toHaveLength(0);
    });

    it('should accept null profile picture', async () => {
      dto.profile_picture = null as any;
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'profile_picture')).toHaveLength(0);
    });

    it('should accept undefined profile picture', async () => {
      dto.profile_picture = undefined;
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'profile_picture')).toHaveLength(0);
    });

    it('should reject non-string profile picture', async () => {
      dto.profile_picture = 123 as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'profile_picture')).toBe(true);
    });
  });

  describe('Multiple Field Validation', () => {
    it('should report multiple validation errors', async () => {
      dto.fullname = '';
      dto.email = 'invalid-email';
      dto.username = '';
      dto.password = 'weak';
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(4);
      
      const properties = errors.map(e => e.property);
      expect(properties).toContain('fullname');
      expect(properties).toContain('email');
      expect(properties).toContain('username');
      expect(properties).toContain('password');
    });

    it('should pass validation with minimal valid data', async () => {
      dto = new CreateUserDto();
      dto.fullname = 'John';
      dto.email = 'j@e.co';
      dto.username = 'j';
      dto.password = 'MinPass1!';
      
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});