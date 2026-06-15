import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GuideProfile } from './guide-profile.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Trip } from '@/modules/trip/entities/trip.entity';

/**
 * State machine for a guide booking. Transitions:
 *  PENDING_ACCEPTANCE → REJECTED                              (guide rejects)
 *  PENDING_ACCEPTANCE → PENDING_PAYMENT                       (guide accepts)
 *  PENDING_PAYMENT    → EXPIRED                               (auto, +24h no pay)
 *  PENDING_PAYMENT    → CONFIRMED                             (traveler pays)
 *  CONFIRMED          → CANCELLED                             (either side)
 *  CONFIRMED          → COMPLETED                             (auto/end-of-trip)
 *
 * Legacy values (PENDING / CONFIRMED / COMPLETED / CANCELLED) are retained for
 * backward compatibility with rows already in the database; service code uses
 * the new tokens for all new state writes.
 */
export enum BookingStatus {
  PENDING_ACCEPTANCE = 'pending_acceptance',
  PENDING_PAYMENT = 'pending_payment',
  CONFIRMED = 'confirmed',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  /** @deprecated kept for legacy rows. */
  PENDING = 'pending',
}

@Entity('guide_bookings')
export class GuideBooking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => GuideProfile, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guide_id' })
  guide!: GuideProfile;

  @Index()
  @Column({ name: 'guide_id' })
  guideId!: string;

  /** Traveler who hired the guide. */
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'traveler_id' })
  traveler!: User;

  @Index()
  @Column({ name: 'traveler_id' })
  travelerId!: string;

  /** Optional trip the booking is tied to. */
  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trip_id' })
  trip?: Trip | null;

  @Column({ name: 'trip_id', nullable: true })
  tripId?: string | null;

  @Column({ name: 'tour_title', length: 200 })
  tourTitle!: string;

  @Column({ name: 'tour_cover', length: 500 })
  tourCover!: string;

  @Column({ length: 200 })
  destination!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string;

  @Column({ name: 'duration_days', default: 1 })
  durationDays!: number;

  @Column({ name: 'group_size', default: 1 })
  groupSize!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  amount!: number;

  @Column({ length: 8, default: 'VND' })
  currency!: string;

  @Column({ length: 1000, nullable: true })
  message?: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING_ACCEPTANCE,
  })
  status!: BookingStatus;

  @Column({ name: 'cancel_reason', length: 500, nullable: true })
  cancelReason?: string;

  /** When the guide accepted the request — used for the 24h payment expiry. */
  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt?: Date | null;

  /** When the traveler paid (i.e. status moved to CONFIRMED). */
  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  /** When the trip was marked complete. */
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
