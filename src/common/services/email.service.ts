import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private transporter: Transporter<SMTPTransport.SentMessageInfo>;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on configuration
   */
  private initializeTransporter(): void {
    const serviceType = this.configService.get<string>('EMAIL_SERVICE_TYPE', 'smtp');
    
    try {
      if (serviceType === 'gmail') {
        // Gmail-specific configuration
        this.transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: this.configService.get<string>('EMAIL_USER'),
            pass: this.configService.get<string>('EMAIL_PASSWORD'),
          },
        });
      } else {
        // Generic SMTP configuration
        this.transporter = nodemailer.createTransporter({
          host: this.configService.get<string>('EMAIL_HOST'),
          port: this.configService.get<number>('EMAIL_PORT', 587),
          secure: this.configService.get<boolean>('EMAIL_SECURE', false),
          auth: {
            user: this.configService.get<string>('EMAIL_USER'),
            pass: this.configService.get<string>('EMAIL_PASSWORD'),
          },
          // Additional options for better reliability
          pool: true,
          maxConnections: 5,
          maxMessages: 10,
        });
      }

      this.logger.log(`Email service initialized with ${serviceType} transport`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize email service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : ''
      );
      throw error;
    }
  }

  /**
   * Send password reset email to user
   * @param email - User's email address
   * @param resetToken - Password reset token
   * @param username - Optional username for personalization
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    username?: string
  ): Promise<void> {
    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
      const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;
      
      const displayName = username || email.split('@')[0];
      const expirationTime = '15 minutes';

      const subject = 'Reset Your Unara Password';
      const html = this.generatePasswordResetHtml(displayName, resetLink, expirationTime);
      const text = this.generatePasswordResetText(displayName, resetLink, expirationTime);

      await this.sendEmail({
        to: email,
        subject,
        html,
        text,
      });

      this.logger.log(`Password reset email sent successfully to: ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : ''
      );
      throw error;
    }
  }

  /**
   * Send generic email
   * @param options - Email options (to, subject, html, text)
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const fromAddress = this.configService.get<string>('EMAIL_FROM_ADDRESS', 'noreply@unara.com');
      const fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'Unara Support');

      const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      this.logger.log(
        `Email sent successfully to ${options.to}. Message ID: ${info.messageId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : ''
      );
      throw error;
    }
  }

  /**
   * Generate HTML content for password reset email
   * @param displayName - User's display name
   * @param resetLink - Password reset link
   * @param expirationTime - Token expiration time
   */
  private generatePasswordResetHtml(
    displayName: string,
    resetLink: string,
    expirationTime: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Unara Password</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .title {
            color: #1f2937;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .reset-button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            transition: background-color 0.3s ease;
        }
        .reset-button:hover {
            background-color: #1d4ed8;
        }
        .warning {
            background-color: #fef3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
        .warning-icon {
            color: #856404;
            font-weight: bold;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #6c757d;
        }
        .link {
            word-break: break-all;
            color: #2563eb;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🧳 Unara</div>
            <h1 class="title">Password Reset Request</h1>
        </div>
        
        <div class="content">
            <p>Hello <strong>${displayName}</strong>,</p>
            
            <p>We received a request to reset the password for your Unara account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="${resetLink}" class="reset-button">Reset Password</a>
            </div>
            
            <div class="warning">
                <p><span class="warning-icon">⚠️ Important:</span></p>
                <ul>
                    <li>This link will expire in <strong>${expirationTime}</strong></li>
                    <li>If you didn't request this password reset, you can safely ignore this email</li>
                    <li>Your password will remain unchanged until you create a new one</li>
                </ul>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p class="link">${resetLink}</p>
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The Unara Team</p>
            <p><em>This is an automated message, please do not reply to this email.</em></p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate plain text content for password reset email
   * @param displayName - User's display name
   * @param resetLink - Password reset link
   * @param expirationTime - Token expiration time
   */
  private generatePasswordResetText(
    displayName: string,
    resetLink: string,
    expirationTime: string
  ): string {
    return `
UNARA - Password Reset Request

Hello ${displayName},

We received a request to reset the password for your Unara account.

If you made this request, click the following link to reset your password:
${resetLink}

IMPORTANT:
- This link will expire in ${expirationTime}
- If you didn't request this password reset, you can safely ignore this email
- Your password will remain unchanged until you create a new one

Best regards,
The Unara Team

---
This is an automated message, please do not reply to this email.
    `;
  }

  /**
   * Strip HTML tags from content for plain text fallback
   * @param html - HTML content
   * @returns Plain text content
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Test email configuration
   * @returns Promise<boolean> - True if configuration is valid
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email configuration test successful');
      return true;
    } catch (error) {
      this.logger.error(
        `Email configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : ''
      );
      return false;
    }
  }

  /**
   * Close the transporter connection
   */
  async close(): Promise<void> {
    try {
      if (this.transporter) {
        this.transporter.close();
        this.logger.log('Email service connection closed');
      }
    } catch (error) {
      this.logger.error(
        `Error closing email service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : ''
      );
    }
  }
}