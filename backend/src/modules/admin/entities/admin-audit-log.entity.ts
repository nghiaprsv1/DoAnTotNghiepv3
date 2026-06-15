import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('admin_audit_logs')
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'admin_id' })
  adminId!: string;

  /** Action key, e.g. 'guide.approve', 'user.lock' */
  @Column({ length: 100 })
  action!: string;

  @Column({ name: 'target_type', length: 50, nullable: true })
  targetType?: string;

  @Column({ name: 'target_id', nullable: true })
  targetId?: string;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
