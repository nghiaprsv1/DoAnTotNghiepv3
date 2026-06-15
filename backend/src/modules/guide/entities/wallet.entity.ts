import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';

/**
 * Per-user financial wallet. Tracks the two-bucket model the spec requires:
 *  - balanceFrozen: held while a tour is `CONFIRMED` but not yet `COMPLETED`.
 *  - balanceAvailable: settled funds the guide can request to withdraw.
 *
 * The system also issues commission to a synthetic admin wallet (one row per
 * admin). Wallets are 1:1 with users.
 */
@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index({ unique: true })
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({
    name: 'balance_available',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  balanceAvailable!: number;

  @Column({
    name: 'balance_frozen',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  balanceFrozen!: number;

  @Column({ length: 8, default: 'VND' })
  currency!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
