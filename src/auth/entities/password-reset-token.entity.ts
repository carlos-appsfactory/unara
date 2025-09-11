import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('password_reset_tokens')
@Index(['userId'])
@Index(['expiresAt'])
@Index(['usedAt'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    name: 'token_hash', 
    unique: true 
  })
  tokenHash: string;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamp', name: 'used_at', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationship to User entity
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Check if the password reset token is expired
   * @returns true if token is expired, false otherwise
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if the password reset token has been used
   * @returns true if token has been used, false otherwise
   */
  isUsed(): boolean {
    return this.usedAt !== null;
  }

  /**
   * Check if the password reset token is valid (not expired and not used)
   * @returns true if token is valid, false otherwise
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isUsed();
  }

  /**
   * Mark the token as used
   */
  markAsUsed(): void {
    this.usedAt = new Date();
  }
}