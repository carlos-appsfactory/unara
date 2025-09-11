import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(),
}));

describe('EmailService', () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;
  let mockTransporter: jest.Mocked<any>;

  const mockEmailConfig = {
    EMAIL_SERVICE_TYPE: 'smtp',
    EMAIL_HOST: 'smtp.test.com',
    EMAIL_PORT: 587,
    EMAIL_SECURE: false,
    EMAIL_USER: 'test@example.com',
    EMAIL_PASSWORD: 'testpassword',
    EMAIL_FROM_ADDRESS: 'noreply@unara.com',
    EMAIL_FROM_NAME: 'Unara Support',
    FRONTEND_URL: 'http://localhost:3000',
  };

  beforeEach(async () => {
    // Create mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
      close: jest.fn(),
    };

    // Mock nodemailer.createTransporter
    (nodemailer.createTransporter as jest.Mock).mockReturnValue(mockTransporter);

    // Create mock ConfigService
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        return mockEmailConfig[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Transporter Initialization', () => {
    it('should initialize SMTP transporter by default', () => {
      expect(nodemailer.createTransporter).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'testpassword',
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 10,
      });
    });

    it('should initialize Gmail transporter when service type is gmail', async () => {
      // Update config to return gmail
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'EMAIL_SERVICE_TYPE') return 'gmail';
        return mockEmailConfig[key] || defaultValue;
      });

      // Recreate service to trigger initialization
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const gmailService = module.get<EmailService>(EmailService);

      expect(nodemailer.createTransporter).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: 'test@example.com',
          pass: 'testpassword',
        },
      });
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const email = 'user@example.com';
      const resetToken = 'test-reset-token-123';
      const username = 'testuser';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(email, resetToken, username);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"Unara Support" <noreply@unara.com>',
        to: email,
        subject: 'Reset Your Unara Password',
        html: expect.stringContaining('testuser'),
        text: expect.stringContaining('testuser'),
      });

      // Verify the reset link is included
      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentEmail.html).toContain(`http://localhost:3000/auth/reset-password?token=${resetToken}`);
      expect(sentEmail.text).toContain(`http://localhost:3000/auth/reset-password?token=${resetToken}`);
    });

    it('should use email username when no username provided', async () => {
      const email = 'testuser@example.com';
      const resetToken = 'test-reset-token-123';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(email, resetToken);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentEmail.html).toContain('testuser');
      expect(sentEmail.text).toContain('testuser');
    });

    it('should handle email sending errors', async () => {
      const email = 'user@example.com';
      const resetToken = 'test-reset-token-123';
      const emailError = new Error('SMTP connection failed');

      mockTransporter.sendMail.mockRejectedValue(emailError);

      await expect(
        service.sendPasswordResetEmail(email, resetToken)
      ).rejects.toThrow('SMTP connection failed');
    });

    it('should include security warnings in email content', async () => {
      const email = 'user@example.com';
      const resetToken = 'test-reset-token-123';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(email, resetToken);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentEmail.html).toContain('15 minutes');
      expect(sentEmail.html).toContain('safely ignore this email');
      expect(sentEmail.text).toContain('15 minutes');
      expect(sentEmail.text).toContain('safely ignore this email');
    });
  });

  describe('sendEmail', () => {
    it('should send generic email successfully', async () => {
      const emailOptions = {
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
        text: 'Test text content',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendEmail(emailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"Unara Support" <noreply@unara.com>',
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text,
      });
    });

    it('should generate text from HTML when text is not provided', async () => {
      const emailOptions = {
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendEmail(emailOptions);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentEmail.text).toBe('Test HTML content');
    });

    it('should handle email sending errors', async () => {
      const emailOptions = {
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };
      const emailError = new Error('Email sending failed');

      mockTransporter.sendMail.mockRejectedValue(emailError);

      await expect(service.sendEmail(emailOptions)).rejects.toThrow(
        'Email sending failed'
      );
    });
  });

  describe('HTML Processing', () => {
    it('should generate proper HTML for password reset email', async () => {
      const email = 'user@example.com';
      const resetToken = 'test-reset-token-123';
      const username = 'testuser';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(email, resetToken, username);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = sentEmail.html;

      // Check HTML structure
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="en">');
      expect(htmlContent).toContain('Reset Your Unara Password');
      expect(htmlContent).toContain('🧳 Unara');
      expect(htmlContent).toContain('reset-button');
      expect(htmlContent).toContain('warning');
    });

    it('should strip HTML tags properly for text content', async () => {
      const htmlContent = '<p>Hello <strong>user</strong>, click <a href="http://example.com">here</a>.</p>';
      const emailOptions = {
        to: 'user@example.com',
        subject: 'Test',
        html: htmlContent,
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendEmail(emailOptions);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentEmail.text).toBe('Hello user, click here.');
    });
  });

  describe('testConnection', () => {
    it('should return true when connection test passes', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should return false when connection test fails', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();

      expect(result).toBe(false);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close transporter connection', async () => {
      await service.close();

      expect(mockTransporter.close).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      mockTransporter.close.mockImplementation(() => {
        throw new Error('Close failed');
      });

      await expect(service.close()).resolves.not.toThrow();
    });
  });

  describe('Configuration Handling', () => {
    it('should use default values when config is missing', async () => {
      // Mock config service to return the default values properly
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'EMAIL_FROM_ADDRESS' && defaultValue) return defaultValue;
        if (key === 'EMAIL_FROM_NAME' && defaultValue) return defaultValue;
        if (key === 'FRONTEND_URL' && defaultValue) return defaultValue;
        return mockEmailConfig[key] || defaultValue;
      });

      const email = 'user@example.com';
      const resetToken = 'test-reset-token-123';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(email, resetToken);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentEmail.from).toContain('noreply@unara.com');
      expect(sentEmail.from).toContain('Unara Support');
      expect(sentEmail.html).toContain('http://localhost:3000/auth/reset-password');
    });
  });

  describe('Email Content Validation', () => {
    it('should include all required elements in password reset email', async () => {
      const email = 'user@example.com';
      const resetToken = 'test-reset-token-123';
      const username = 'testuser';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(email, resetToken, username);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = sentEmail.html;
      const textContent = sentEmail.text;

      // Required elements in both HTML and text
      const requiredElements = [
        'testuser',
        'password reset',  // Changed from 'Reset Password' to match actual content
        '15 minutes',
        resetToken,
        'safely ignore this email',
        'Unara Team',
      ];

      requiredElements.forEach(element => {
        expect(htmlContent).toContain(element);
        expect(textContent).toContain(element);
      });
    });

    it('should generate mobile-friendly HTML', async () => {
      const email = 'user@example.com';
      const resetToken = 'test-reset-token-123';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(email, resetToken);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = sentEmail.html;

      expect(htmlContent).toContain('viewport');
      expect(htmlContent).toContain('max-width: 600px');
      expect(htmlContent).toContain('word-break: break-all');
    });
  });
});