import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/** Refresh token whitelist — supports logout-all & rotation. */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  /** Hashed token (sha256), never store raw refresh tokens. */
  @Column({ name: 'token_hash', length: 128 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt?: Date | null;

  @Column({ name: 'user_agent', length: 255, nullable: true })
  userAgent?: string;

  @Column({ name: 'ip_address', length: 64, nullable: true })
  ipAddress?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
