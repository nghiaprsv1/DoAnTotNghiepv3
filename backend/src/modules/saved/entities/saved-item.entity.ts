import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Polymorphic bookmark — supports `post`, `trip`, `guide` via `target_type`.
 * One row per (user, target_type, target_id); inserts/deletes are idempotent
 * via the unique constraint.
 */
export type SavedTargetType = 'post' | 'trip' | 'guide';

@Entity('saved_items')
@Unique(['userId', 'targetType', 'targetId'])
export class SavedItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @Index()
  @Column({ name: 'target_type', length: 20 })
  targetType!: SavedTargetType;

  @Index()
  @Column({ name: 'target_id' })
  targetId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
