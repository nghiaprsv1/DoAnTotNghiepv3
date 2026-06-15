import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AiChatSession } from './ai-chat-session.entity';

export enum AiRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

@Entity('ai_chat_messages')
export class AiChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => AiChatSession, (s) => s.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: AiChatSession;

  @Index()
  @Column({ name: 'session_id' })
  sessionId!: string;

  @Column({ type: 'enum', enum: AiRole })
  role!: AiRole;

  @Column({ type: 'text' })
  content!: string;

  /** When assistant returned trip suggestions, attach their ids. */
  @Column({ name: 'trip_ids', type: 'text', array: true, default: () => "'{}'::text[]" })
  tripIds!: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
