import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Trip } from './trip.entity';

/**
 * Per-(user, trip) interaction ledger powering the "interaction score" term of
 * the recommendation formula. One row per pair; counters accumulate over time.
 *  - views:     số lần user mở trang chi tiết chuyến.
 *  - clicks:    số lần user click/mở thẻ chuyến trong danh sách.
 *  - favorited: user đã bookmark chuyến (đồng bộ từ saved_items).
 *  - requested: user đã gửi yêu cầu tham gia.
 */
@Entity('trip_interactions')
@Unique(['userId', 'tripId'])
export class TripInteraction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: Trip;

  @Index()
  @Column({ name: 'trip_id' })
  tripId!: string;

  @Column({ default: 0 })
  views!: number;

  @Column({ default: 0 })
  clicks!: number;

  @Column({ default: false })
  favorited!: boolean;

  @Column({ default: false })
  requested!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
