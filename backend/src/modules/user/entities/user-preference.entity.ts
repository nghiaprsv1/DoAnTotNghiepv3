import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** User-declared travel interests for AI personalization (Gemini). */
@Entity('user_preferences')
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'user_id' })
  userId!: string;

  /** Categories user likes (beach, mountain, food, ...). */
  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  categories!: string[];

  /** Free-form interests / hashtags. */
  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  interests!: string[];

  /** Provinces preferred. */
  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  provinces!: string[];

  /** Budget tier: low | medium | high — optional */
  @Column({ length: 20, nullable: true })
  budgetTier?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
