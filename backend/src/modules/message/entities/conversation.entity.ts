import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConversationMember } from './conversation-member.entity';
import { ChatMessage } from './chat-message.entity';

export enum ConversationKind {
  DIRECT = 'direct',
  GROUP = 'group',
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ConversationKind, default: ConversationKind.DIRECT })
  kind!: ConversationKind;

  /** Group only */
  @Column({ name: 'group_name', length: 200, nullable: true })
  groupName?: string;

  /** Group only */
  @Column({ name: 'group_avatar', length: 500, nullable: true })
  groupAvatar?: string;

  /**
   * For trip-bound group chats. When a Trip is created we spin up a single
   * Conversation with this column set so we can later look it up via
   * `findOne({ tripId })` and add/remove members as travelers join or leave.
   * Direct chats and ad-hoc groups leave this null.
   */
  @Index()
  @Column({ name: 'trip_id', type: 'uuid', nullable: true })
  tripId?: string | null;

  /** Last message preview, denormalized for list view. */
  @Column({ name: 'last_message', length: 500, nullable: true })
  lastMessage?: string;

  @Index()
  @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @OneToMany(() => ConversationMember, (m) => m.conversation)
  members!: ConversationMember[];

  @OneToMany(() => ChatMessage, (m) => m.conversation)
  messages!: ChatMessage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
