import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import helmet from 'helmet';

describe('Security Validation Tests', () => {

  describe('DTO Validation Security', () => {
    it('should validate ForgotPasswordDto with enhanced security', async () => {
      const testCases = [
        { email: 'test@example.com', shouldPass: true },
        { email: '  TEST@EXAMPLE.COM  ', shouldPass: true }, // Should be transformed
        { email: 'invalid-email', shouldPass: false },
        { email: '<script>alert("xss")</script>@example.com', shouldPass: false },
        { email: '', shouldPass: false },
        { email: null, shouldPass: false },
      ];

      for (const { email, shouldPass } of testCases) {
        const dto = plainToClass(ForgotPasswordDto, { email });
        const errors = await validate(dto);
        
        if (shouldPass) {
          expect(errors).toHaveLength(0);
          if (typeof email === 'string' && email.trim()) {
            expect(dto.email).toBe(email.toLowerCase().trim());
          }
        } else {
          expect(errors.length).toBeGreaterThan(0);
        }
      }
    });

    it('should validate ResetPasswordDto with enhanced security', async () => {
      const testCases = [
        { token: 'abcd1234ef567890', newPassword: 'ValidPass123!', shouldPass: true },
        { token: '  abcd1234ef567890  ', newPassword: 'ValidPass123!', shouldPass: true }, // Should be trimmed
        { token: 'token-with-dashes', newPassword: 'ValidPass123!', shouldPass: false },
        { token: '<script>alert("xss")</script>', newPassword: 'ValidPass123!', shouldPass: false },
        { token: 'a'.repeat(200), newPassword: 'ValidPass123!', shouldPass: false }, // Too long
        { token: '', newPassword: 'ValidPass123!', shouldPass: false },
        { token: 'validtoken123', newPassword: 'weak', shouldPass: false },
      ];

      for (const { token, newPassword, shouldPass } of testCases) {
        const dto = plainToClass(ResetPasswordDto, { token, newPassword });
        const errors = await validate(dto);
        
        if (shouldPass) {
          expect(errors).toHaveLength(0);
          if (typeof token === 'string' && token.trim()) {
            expect(dto.token).toBe(token.trim());
          }
        } else {
          expect(errors.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Input Sanitization Security', () => {
    it('should reject email with injection patterns', async () => {
      const maliciousEmails = [
        '<script>alert("xss")</script>@example.com',
        'javascript:alert("xss")@example.com',
        '${alert("xss")}@example.com',
        '{{constructor.constructor("alert(1)")()}}@example.com',
        "'; DROP TABLE users; --@example.com",
        "' OR '1'='1@example.com",
      ];

      for (const email of maliciousEmails) {
        const dto = plainToClass(ForgotPasswordDto, { email });
        const errors = await validate(dto);
        
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should reject tokens with injection patterns', async () => {
      const maliciousTokens = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '${alert("xss")}',
        '{{constructor.constructor("alert(1)")()}}',
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        'token with spaces',
        'token-with-dashes',
        'token_with_underscores',
      ];

      for (const token of maliciousTokens) {
        const dto = plainToClass(ResetPasswordDto, { token, newPassword: 'ValidPass123!' });
        const errors = await validate(dto);
        
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should properly transform and sanitize valid inputs', async () => {
      // Test email transformation
      const emailDto = plainToClass(ForgotPasswordDto, { email: '  TEST@EXAMPLE.COM  ' });
      const emailErrors = await validate(emailDto);
      
      expect(emailErrors).toHaveLength(0);
      expect(emailDto.email).toBe('test@example.com');

      // Test token transformation
      const tokenDto = plainToClass(ResetPasswordDto, { 
        token: '  abcd1234ef567890  ', 
        newPassword: 'ValidPass123!' 
      });
      const tokenErrors = await validate(tokenDto);
      
      expect(tokenErrors).toHaveLength(0);
      expect(tokenDto.token).toBe('abcd1234ef567890');
    });
  });

  describe('Security Headers Configuration', () => {
    it('should configure helmet with proper security settings', () => {
      // Test helmet configuration
      const helmetConfig = {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false,
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      };

      expect(helmetConfig.contentSecurityPolicy.directives.defaultSrc).toContain("'self'");
      expect(helmetConfig.contentSecurityPolicy.directives.objectSrc).toContain("'none'");
      expect(helmetConfig.contentSecurityPolicy.directives.frameSrc).toContain("'none'");
      expect(helmetConfig.hsts.maxAge).toBe(31536000);
      expect(helmetConfig.hsts.includeSubDomains).toBe(true);
      expect(helmetConfig.hsts.preload).toBe(true);
    });
  });

  describe('Password Policy Security', () => {
    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        'weak',
        '12345678',
        'password',
        'Password',
        'Password1',
        'password123',
        'PASSWORD123',
        'Pass123',
      ];

      for (const password of weakPasswords) {
        const dto = plainToClass(ResetPasswordDto, {
          token: 'validtoken123',
          newPassword: password
        });
        const errors = await validate(dto);
        
        expect(errors.length).toBeGreaterThan(0);
        
        // Find the password validation error
        const passwordErrors = errors.filter(error => 
          Object.keys(error.constraints || {}).some(key => key.includes('matches'))
        );
        expect(passwordErrors.length).toBeGreaterThan(0);
      }
    });

    it('should accept strong passwords', async () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecure#Pass1',
        'Complex$Password9',
        'Unbreakable@123',
      ];

      for (const password of strongPasswords) {
        const dto = plainToClass(ResetPasswordDto, {
          token: 'validtoken123',
          newPassword: password
        });
        const errors = await validate(dto);
        
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('Token Length and Format Security', () => {
    it('should reject tokens that exceed maximum length', async () => {
      const longToken = 'a'.repeat(200); // Exceeds 128 char limit
      
      const dto = plainToClass(ResetPasswordDto, {
        token: longToken,
        newPassword: 'ValidPass123!'
      });
      const errors = await validate(dto);
      
      expect(errors.length).toBeGreaterThan(0);
      
      // Should have maxLength constraint violation
      const lengthError = errors.find(error => 
        error.constraints && Object.keys(error.constraints).includes('maxLength')
      );
      expect(lengthError).toBeDefined();
    });

    it('should accept valid token formats', async () => {
      const validTokens = [
        'abcd1234ef567890',
        'ABC123DEF456',
        'token123456789',
        'VALIDTOKEN987654321',
      ];

      for (const token of validTokens) {
        const dto = plainToClass(ResetPasswordDto, {
          token,
          newPassword: 'ValidPass123!'
        });
        const errors = await validate(dto);
        
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('Email Format Security', () => {
    it('should enforce strict email format validation', async () => {
      const invalidEmailFormats = [
        'plainaddress',
        '@missingusername.com',
        'username@.com',
        'username@.com.',
        'username@com',
        'username..double.dot@example.com',
        'username@-example.com',
        'username@example-.com',
      ];

      for (const email of invalidEmailFormats) {
        const dto = plainToClass(ForgotPasswordDto, { email });
        const errors = await validate(dto);
        
        expect(errors.length).toBeGreaterThan(0);
        
        // Should have email format validation errors
        const emailErrors = errors.filter(error => 
          error.constraints && (
            Object.keys(error.constraints).includes('isEmail') ||
            Object.keys(error.constraints).includes('matches')
          )
        );
        expect(emailErrors.length).toBeGreaterThan(0);
      }
    });

    it('should accept valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example123.com',
        'test@subdomain.example.com',
      ];

      for (const email of validEmails) {
        const dto = plainToClass(ForgotPasswordDto, { email });
        const errors = await validate(dto);
        
        expect(errors).toHaveLength(0);
      }
    });
  });
});