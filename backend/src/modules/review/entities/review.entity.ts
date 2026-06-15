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

export enum ReviewTargetType {
  PLACE = 'place',
  TRIP = 'trip',
  GUIDE = 'guide',
  MEMBER = 'member',
}

@Entity('reviews')
@Unique(['authorId', 'targetType', 'targetId', 'parentId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author!: User;

  @Index()
  @Column({ name: 'author_id' })
  authorId!: string;

  @Column({ name: 'target_type', type: 'enum', enum: ReviewTargetType })
  targetType!: ReviewTargetType;

  @Index()
  @Column({ name: 'target_id' })
  targetId!: string;

  /**
   * For replies — the id of the root review being responded to. Replies are
   * exempt from the one-rating-per-user rule and may have rating=0.
   */
  @Index()
  @Column({ name: 'parent_id', nullable: true })
  parentId?: string | null;

  @ManyToOne(() => Review, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent?: Review | null;

  @Column({ type: 'smallint' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  tags!: string[];

  @Column({ name: 'helpful_count', default: 0 })
  helpfulCount!: number;

  /** Aggregate like counter, kept consistent via the polymorphic Like table. */
  @Column({ name: 'like_count', default: 0 })
  likeCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
