import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('oauth_providers')
export class OAuthProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  user_id: string;

  @Column({ type: 'varchar', length: 50, name: 'provider_name' })
  provider_name: string; // 'google', 'facebook', 'microsoft', 'apple'

  @Column({ type: 'varchar', length: 255, name: 'provider_id' })
  provider_id: string; // The OAuth provider's user ID

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string; // Email from OAuth provider (for verification)

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string; // Display name from OAuth provider

  @Column({ type: 'text', nullable: true })
  picture?: string; // Profile picture URL from OAuth provider

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}