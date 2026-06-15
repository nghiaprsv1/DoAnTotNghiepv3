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
import { Trip } from '@/modules/trip/entities/trip.entity';
import { Place } from '@/modules/place/entities/place.entity';
import { Comment } from './comment.entity';

/** Who can see a post. */
export enum PostVisibility {
  /** Anyone, including guests. Default. */
  PUBLIC = 'public',
  /** Only people the author follows back (mutuals). */
  FRIENDS = 'friends',
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author!: User;

  @Index()
  @Column({ name: 'author_id' })
  authorId!: string;

  @Column({ length: 300 })
  title!: string;

  @Column({ type: 'text' })
  excerpt!: string;

  @Column({ type: 'text', nullable: true })
  body?: string;

  @Column({ length: 200 })
  location!: string;

  /** Single hero image URL. */
  @Column({ length: 500 })
  image!: string;

  @Column({ name: 'gallery_urls', type: 'text', array: true, default: () => "'{}'::text[]" })
  galleryUrls!: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  tags!: string[];

  /** Optional link back to a trip / place. */
  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trip_id' })
  trip?: Trip | null;

  @Column({ name: 'trip_id', nullable: true })
  tripId?: string | null;

  @ManyToOne(() => Place, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'place_id' })
  place?: Place | null;

  @Column({ name: 'place_id', nullable: true })
  placeId?: string | null;

  @Column({ name: 'like_count', default: 0 })
  likeCount!: number;

  @Column({ name: 'comment_count', default: 0 })
  commentCount!: number;

  @Column({ name: 'share_count', default: 0 })
  shareCount!: number;

  /** Who can view this post. Filtered server-side in `list()` / `detail()`. */
  @Index()
  @Column({ type: 'enum', enum: PostVisibility, default: PostVisibility.PUBLIC })
  visibility!: PostVisibility;

  @OneToMany(() => Comment, (c) => c.post)
  comments!: Comment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
