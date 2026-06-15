import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '@/modules/user/entities/user.entity';

@Entity('conversation_members')
@Unique(['conversationId', 'userId'])
export class ConversationMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Conversation, (c) => c.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;

  @Index()
  @Column({ name: 'conversation_id' })
  conversationId!: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'is_admin', default: false })
  isAdmin!: boolean;

  @Column({ default: false })
  pinned!: boolean;

  /** Per-user read receipt cursor. */
  @Column({ name: 'last_read_at', type: 'timestamp', nullable: true })
  lastReadAt?: Date;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt!: Date;
}
