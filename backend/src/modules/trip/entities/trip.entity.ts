import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Category } from '@/modules/place/entities/category.entity';
import { TripMember } from './trip-member.entity';
import { ItineraryDay } from './itinerary-day.entity';
import { TripJoinRequest } from './trip-join-request.entity';

export enum TripStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

/**
 * Quick description of what is bundled with the trip — surfaced on the detail
 * page (Lưu trú / Di chuyển / Bữa ăn). All fields are free-form short labels.
 */
export interface TripInclusions {
  accommodation?: string;
  transport?: string;
  meals?: string;
}

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ length: 200 })
  destination!: string;

  /** Optional starting point (free-form name). Null = chưa đặt điểm xuất phát. */
  @Column({ name: 'origin_name', type: 'varchar', length: 200, nullable: true })
  originName?: string | null;

  /** Geocoded coordinates so the detail map can render without re-geocoding. */
  @Column({ name: 'origin_lat', type: 'numeric', precision: 9, scale: 6, nullable: true })
  originLat?: number | null;

  @Column({ name: 'origin_lng', type: 'numeric', precision: 9, scale: 6, nullable: true })
  originLng?: number | null;

  @Column({ name: 'destination_lat', type: 'numeric', precision: 9, scale: 6, nullable: true })
  destinationLat?: number | null;

  @Column({ name: 'destination_lng', type: 'numeric', precision: 9, scale: 6, nullable: true })
  destinationLng?: number | null;

  @ManyToOne(() => Category, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @Column({ name: 'category_id' })
  categoryId!: string;

  @Column({ name: 'cover_image', length: 500 })
  coverImage!: string;

  @Column({ name: 'gallery_urls', type: 'text', array: true, default: () => "'{}'::text[]" })
  galleryUrls!: string[];

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'duration_days' })
  durationDays!: number;

  @Column({ name: 'price_from', type: 'numeric', precision: 12, scale: 2, default: 0 })
  priceFrom!: number;

  @Column({ length: 8, default: 'VND' })
  currency!: string;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  rating!: number;

  @Column({ name: 'max_members', default: 8 })
  maxMembers!: number;

  /** Denormalized counter — kept in sync by service. */
  @Column({ name: 'member_count', default: 1 })
  memberCount!: number;

  /** Độ hot — tổng lượt xem chi tiết (tăng bởi POST /trips/:id/view). */
  @Column({ name: 'view_count', default: 0 })
  viewCount!: number;

  /** Độ hot — tổng lượt click/mở thẻ (tăng bởi POST /trips/:id/click). */
  @Column({ name: 'click_count', default: 0 })
  clickCount!: number;

  /** Độ hot — tổng lượt gửi yêu cầu tham gia (mọi trạng thái). */
  @Column({ name: 'request_count', default: 0 })
  requestCount!: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator!: User;

  @Index()
  @Column({ name: 'creator_id' })
  creatorId!: string;

  /** Optional hired guide (separate from creator). */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'guide_id' })
  guide?: User | null;

  @Column({ name: 'guide_id', nullable: true })
  guideId?: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  tags!: string[];

  /** Optional inclusions surfaced on the detail page (Lưu trú / Di chuyển / Bữa ăn). */
  @Column({ type: 'jsonb', nullable: true })
  inclusions?: TripInclusions | null;

  @Column({ type: 'enum', enum: TripStatus, default: TripStatus.PUBLISHED })
  status!: TripStatus;

  /**
   * Lý do huỷ chuyến (lưu để tra cứu) — chỉ có khi status = CANCELLED.
   * KHÔNG tạo bảng mới: lưu thẳng cột trên `trips`.
   */
  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason?: string | null;

  /** Thời điểm huỷ. */
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date | null;

  /** Ai huỷ (chủ chuyến hoặc admin) — phục vụ tra cứu/đối soát. */
  @Column({ name: 'cancelled_by_id', type: 'uuid', nullable: true })
  cancelledById?: string | null;

  @OneToMany(() => TripMember, (m) => m.trip)
  members!: TripMember[];

  @OneToMany(() => ItineraryDay, (d) => d.trip)
  itinerary!: ItineraryDay[];

  @OneToMany(() => TripJoinRequest, (r) => r.trip)
  joinRequests!: TripJoinRequest[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
