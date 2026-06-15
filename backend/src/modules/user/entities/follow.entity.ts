import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  Column,
} from 'typeorm';
import { User } from './user.entity';

@Entity('follows')
@Unique(['followerId', 'followingId'])
export class Follow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  follower!: User;

  @Index()
  @Column({ name: 'follower_id' })
  followerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  following!: User;

  @Index()
  @Column({ name: 'following_id' })
  followingId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
