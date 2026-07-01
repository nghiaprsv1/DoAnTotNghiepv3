import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GuideProfile } from './guide-profile.entity';

/**
 * Ngày nghỉ / bận do HDV TỰ đánh dấu (manual block) để không nhận tour.
 * Khác với "bận vì booking/trip" (suy ra từ guide_bookings + trips) — đây là
 * khoảng ngày HDV chủ động chặn. Được gộp vào busyDates() nên hiện đỏ trên
 * calendar công khai và chặn createBooking trùng ngày.
 */
@Entity('guide_unavailability')
export class GuideUnavailability {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => GuideProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guide_id' })
  guide!: GuideProfile;

  @Index()
  @Column({ name: 'guide_id' })
  guideId!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  /** Ghi chú tuỳ chọn (vd "Nghỉ phép", "Bận việc gia đình"). */
  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
