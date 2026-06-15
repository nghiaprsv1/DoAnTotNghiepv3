import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '@/modules/user/entities/user.entity';

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;

  @Index()
  @Column({ name: 'conversation_id' })
  conversationId!: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender!: User;

  @Index()
  @Column({ name: 'sender_id' })
  senderId!: string;

  @Column({ type: 'text' })
  content!: string;

  /** Single attachment URL. Future: separate attachments table. */
  @Column({ length: 500, nullable: true })
  attachment?: string;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENT })
  status!: MessageStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
