import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';

/** Mirror FE NotificationType from src/types/notification.ts */
export enum NotificationType {
  BOOKING_NEW = 'booking_new',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELLED = 'booking_cancelled',
  REVIEW_NEW = 'review_new',
  COMMENT = 'comment',
  LIKE = 'like',
  FOLLOW = 'follow',
  PAYOUT = 'payout',
  MESSAGE = 'message',
  SYSTEM = 'system',
  GUIDE_APPLICATION = 'guide_application',
  TRIP_UPDATE = 'trip_update',
  TRIP_JOIN_REQUEST = 'trip_join_request',
  TRIP_JOIN_ACCEPTED = 'trip_join_accepted',
  TRIP_JOIN_REJECTED = 'trip_join_rejected',
  TRIP_CANCELLED = 'trip_cancelled',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Recipient. */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ length: 200 })
  title!: string;

  @Column({ length: 500 })
  preview!: string;

  @Column({ type: 'text', nullable: true })
  body?: string;

  /** Optional actor (the user who triggered this). */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'actor_id' })
  actor?: User | null;

  @Column({ name: 'actor_id', nullable: true })
  actorId?: string | null;

  @Column({ name: 'cta_label', length: 100, nullable: true })
  ctaLabel?: string;

  @Column({ name: 'cta_href', length: 500, nullable: true })
  ctaHref?: string;

  @Column({ length: 500, nullable: true })
  image?: string;

  /** Arbitrary metadata for richer rendering. */
  @Column({ type: 'jsonb', nullable: true })
  meta?: { label: string; value: string; icon?: string }[];

  @Index()
  @Column({ default: false })
  read!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
