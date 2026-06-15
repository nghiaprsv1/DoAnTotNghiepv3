import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '@/common/enums/user-role.enum';

/** Optional social-media handles surfaced on the profile page. */
export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
}

/**
 * Free-form travel profile collected on the edit-profile page. Surfaced as
 * chips on the public profile so other travelers can size up compatibility
 * before joining a trip together. All fields are optional.
 */
export interface TravelPreferences {
  /** Multi-select: adventure / relax / culture / food ... */
  travelStyles?: string[];
  /** Multi-select: solo / couple / family ... */
  tripPurposes?: string[];
  /** Single: low / mid / high / luxury */
  budgetLevel?: string | null;
  /** Single: newbie / casual / pro / guide */
  experienceLevel?: string | null;
  /** Multi-select: beach / mountain / island ... */
  terrainPrefs?: string[];
  /** Multi-select: trekking / diving / cycling ... */
  activities?: string[];
  /** Multi-select: vi / en / fr ... */
  languages?: string[];
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 320 })
  email!: string;

  /** bcrypt hash, never returned over API */
  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash!: string;

  @Column({ length: 100 })
  name!: string;

  /** @username — unique handle for /users/:handle */
  @Index({ unique: true })
  @Column({ length: 50, nullable: true })
  handle?: string;

  @Column({ length: 500, nullable: true })
  avatar?: string;

  @Column({ length: 500, nullable: true })
  cover?: string;

  @Column({ length: 1000, nullable: true })
  bio?: string;

  @Column({ length: 100, nullable: true })
  location?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  /** Public social-media links — opt-in. */
  @Column({ name: 'social_links', type: 'jsonb', nullable: true })
  socialLinks?: SocialLinks | null;

  /** Public travel preferences (styles, purposes, budget, experience, …). */
  @Column({ name: 'preferences', type: 'jsonb', nullable: true })
  preferences?: TravelPreferences | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  /** Admin can lock; locked users can't log in. */
  @Column({ name: 'is_locked', default: false })
  isLocked!: boolean;

  /** True after admin verifies (e.g. approved guide). */
  @Column({ default: false })
  verified!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
