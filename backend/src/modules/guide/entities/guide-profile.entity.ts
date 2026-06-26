import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';

export enum GuideStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export enum GuideAvailability {
  AVAILABLE = 'available',
  BUSY = 'busy',
  FULLY_BOOKED = 'fully-booked',
}

@Entity('guide_profiles')
export class GuideProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index({ unique: true })
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ length: 200 })
  region!: string;

  @Column({ name: 'region_keys', type: 'text', array: true, default: () => "'{}'::text[]" })
  regionKeys!: string[];

  @Column({ name: 'category_keys', type: 'text', array: true, default: () => "'{}'::text[]" })
  categoryKeys!: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  languages!: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  specialties!: string[];

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ name: 'years_experience', default: 0 })
  yearsExperience!: number;

  @Column({ name: 'price_per_day', type: 'numeric', precision: 12, scale: 2, default: 0 })
  pricePerDay!: number;

  @Column({ length: 8, default: 'VND' })
  currency!: string;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  rating!: number;

  @Column({ name: 'review_count', default: 0 })
  reviewCount!: number;

  @Column({ name: 'tours_completed', default: 0 })
  toursCompleted!: number;

  @Column({ type: 'enum', enum: GuideAvailability, default: GuideAvailability.AVAILABLE })
  availability!: GuideAvailability;

  @Column({ name: 'availability_label', length: 100, nullable: true })
  availabilityLabel?: string;

  @Column({ name: 'id_card_number', length: 30, nullable: true, select: false })
  idCardNumber?: string;

  @Column({ name: 'id_card_image', length: 500, nullable: true, select: false })
  idCardImage?: string;

  /**
   * Ảnh chứng chỉ / thẻ hành nghề HDV (có thể nhiều mặt). `select: false` —
   * chỉ admin pull ra khi duyệt hồ sơ, không lộ qua API công khai.
   */
  @Column({
    name: 'certificate_images',
    type: 'text',
    array: true,
    default: () => "'{}'::text[]",
    select: false,
  })
  certificateImages!: string[];

  @Column({ type: 'enum', enum: GuideStatus, default: GuideStatus.PENDING })
  status!: GuideStatus;

  @Column({ name: 'reject_reason', length: 500, nullable: true })
  rejectReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
