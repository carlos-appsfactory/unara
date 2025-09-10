import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('login_attempts')
@Index(['identifier'])
@Index(['ip_address'])
@Index(['blocked_until'])
export class LoginAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  identifier: string; // email or username

  @Column({ type: 'varchar', length: 45 })
  ip_address: string;

  @Column({ type: 'int', default: 1 })
  attempt_count: number;

  @Column({ type: 'timestamp', nullable: true })
  blocked_until: Date | null;

  @CreateDateColumn()
  last_attempt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
