import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Trip } from './trip.entity';
import { User } from '@/modules/user/entities/user.entity';

export enum JoinRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('trip_join_requests')
@Unique(['tripId', 'userId'])
export class TripJoinRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Trip, (t) => t.joinRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: Trip;

  @Index()
  @Column({ name: 'trip_id' })
  tripId!: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ length: 500, nullable: true })
  message?: string;

  @Column({ type: 'enum', enum: JoinRequestStatus, default: JoinRequestStatus.PENDING })
  status!: JoinRequestStatus;

  @Column({ name: 'responded_at', type: 'timestamp', nullable: true })
  respondedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
