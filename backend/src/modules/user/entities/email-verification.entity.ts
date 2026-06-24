import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Email-verification OTP — one active code per user at a time. Codes are stored
 * hashed (sha256), never in plain text. A new code revokes older unused ones.
 */
@Entity('email_verifications')
export class EmailVerification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  /** sha256 hash of the 6-digit OTP. */
  @Column({ name: 'code_hash', length: 128 })
  codeHash!: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  /** Wrong-code attempts; locked once it crosses the limit. */
  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts!: number;

  /** Set when the code is successfully used — prevents reuse. */
  @Column({ name: 'consumed_at', type: 'timestamp', nullable: true })
  consumedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
