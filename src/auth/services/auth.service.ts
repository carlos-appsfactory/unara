import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { LoginResponseDto } from '../dto/login-response.dto';
import { PasswordService } from './password.service';
import { JwtAuthService } from './jwt-auth.service';
import { EmailVerificationService } from './email-verification.service';
import { LoginAttemptService } from './login-attempt.service';
import { TokenPair } from '../interfaces/jwt-payload.interface';

export interface RegistrationResponse {
  user: UserResponseDto;
  tokens: TokenPair;
  verificationToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly loginAttemptService: LoginAttemptService,
  ) {}

  /**
   * Registers a new user with email, username, and password
   * @param createUserDto - User registration data
   * @returns Promise containing user data and JWT tokens
   */
  async register(createUserDto: CreateUserDto): Promise<RegistrationResponse> {
    const { email, username, password } = createUserDto;

    this.logger.log(
      `Registration attempt for email: ${email}, username: ${username}`,
    );

    try {
      // Check for existing user with email or username
      // Note: This is a backup check - validation decorators should catch this first
      const existingUser = await this.userRepository.findOne({
        where: [{ email }, { username }],
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new ConflictException(`Email '${email}' is already registered`);
        }
        if (existingUser.username === username) {
          throw new ConflictException(
            `Username '${username}' is already taken`,
          );
        }
      }

      // Hash the password using PasswordService
      const passwordHash = await this.passwordService.hashPassword(password);

      // Create user entity
      const newUser = this.userRepository.create({
        email,
        username,
        password_hash: passwordHash,
        email_verified: false, // Email verification will be implemented later
      });

      // Save user to database
      const savedUser = await this.userRepository.save(newUser);

      // Generate JWT tokens
      const tokens = await this.jwtAuthService.generateTokens(
        savedUser.id,
        savedUser.email,
        savedUser.username,
      );

      // Generate email verification token
      const verificationToken =
        await this.emailVerificationService.generateVerificationToken(
          savedUser.id,
        );

      // Create safe user response (exclude sensitive data)
      const userResponse = UserResponseDto.fromEntity(savedUser);

      this.logger.log(`User registered successfully: ${savedUser.id}`);

      return {
        user: userResponse,
        tokens,
        verificationToken,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.warn(`Registration failed - conflict: ${error.message}`);
        throw error;
      }

      this.logger.error(
        `Registration failed for ${email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Finds a user by email for login purposes
   * @param email - User's email address
   * @returns Promise containing user or null if not found
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
      });
      return user;
    } catch (error) {
      this.logger.error(
        `Error finding user by email ${email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Finds a user by username for login purposes
   * @param username - User's username
   * @returns Promise containing user or null if not found
   */
  async findUserByUsername(username: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { username },
      });
      return user;
    } catch (error) {
      this.logger.error(
        `Error finding user by username ${username}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validates user credentials for login
   * @param identifier - Email or username
   * @param password - Plain text password
   * @returns Promise containing user if valid, null if invalid
   */
  async validateUserCredentials(
    identifier: string,
    password: string,
  ): Promise<User | null> {
    try {
      // Try to find user by email first, then by username
      let user = await this.findUserByEmail(identifier);
      if (!user) {
        user = await this.findUserByUsername(identifier);
      }

      if (!user) {
        return null;
      }

      // Validate password
      const isPasswordValid = await this.passwordService.validatePassword(
        password,
        user.password_hash,
      );

      if (!isPasswordValid) {
        this.logger.warn(`Invalid password attempt for user: ${user.email}`);
        return null;
      }

      // Update last login timestamp
      user.last_login = new Date();
      await this.userRepository.save(user);

      this.logger.log(`User authenticated successfully: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(
        `Error validating credentials for ${identifier}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Authenticates user with login credentials
   * @param loginUserDto - Login credentials (email/username + password)
   * @param ipAddress - Client IP address for brute force protection
   * @returns Promise containing user data and JWT tokens
   */
  async login(
    loginUserDto: LoginUserDto,
    ipAddress?: string,
  ): Promise<LoginResponseDto> {
    const { password } = loginUserDto;
    const identifier = loginUserDto.getIdentifier();

    this.logger.log(
      `Login attempt for identifier: ${identifier} from IP: ${ipAddress || 'unknown'}`,
    );

    try {
      // Validate that we have an identifier
      if (!loginUserDto.hasIdentifier()) {
        throw new UnauthorizedException('Email or username is required');
      }

      // Check for account lockout due to failed attempts
      if (ipAddress) {
        const lockStatus = await this.loginAttemptService.isAccountLocked(
          identifier,
          ipAddress,
        );
        if (lockStatus.isLocked) {
          this.logger.warn(
            `Login blocked for ${identifier} from IP ${ipAddress}. Account locked for ${lockStatus.remainingLockTimeMinutes} minutes.`,
          );
          throw new HttpException(
            `Account temporarily locked due to too many failed attempts. Please try again in ${lockStatus.remainingLockTimeMinutes} minutes.`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // Validate user credentials
      const user = await this.validateUserCredentials(identifier, password);

      if (!user) {
        // Record failed login attempt
        if (ipAddress) {
          await this.loginAttemptService.recordFailedAttempt(
            identifier,
            ipAddress,
          );
        }

        this.logger.warn(`Login failed for identifier: ${identifier}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Clear any existing login attempts on successful authentication
      if (ipAddress) {
        await this.loginAttemptService.clearSuccessfulAttempt(
          identifier,
          ipAddress,
        );
      }

      // Generate JWT tokens
      const tokens = await this.jwtAuthService.generateTokens(
        user.id,
        user.email,
        user.username,
      );

      this.logger.log(`Login successful for user: ${user.id}`);

      // Return login response
      return LoginResponseDto.create(user, tokens);
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        (error instanceof HttpException &&
          error.getStatus() === HttpStatus.TOO_MANY_REQUESTS)
      ) {
        this.logger.warn(`Login failed for ${identifier}: ${error.message}`);
        throw error;
      }

      this.logger.error(
        `Login error for ${identifier}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
