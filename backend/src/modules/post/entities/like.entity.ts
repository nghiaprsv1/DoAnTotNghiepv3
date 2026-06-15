import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/** Polymorphic like — supports post, comment, and review via target_type. */
@Entity('likes')
@Unique(['userId', 'targetType', 'targetId'])
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'target_type', length: 20 })
  targetType!: 'post' | 'comment' | 'review';

  @Index()
  @Column({ name: 'target_id' })
  targetId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
