import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  username: string;

  @Column({ type: 'text', name: 'password_hash' })
  password_hash: string;

  @Column({ type: 'varchar', length: 255 })
  fullname: string;

  @Column({ type: 'text', nullable: true })
  profile_picture?: string;

  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email_verification_token?: string;

  @Column({ type: 'timestamp', nullable: true })
  email_verification_expires_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_login?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
