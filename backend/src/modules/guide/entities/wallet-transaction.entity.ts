import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

/** A movement of money in or out of a Wallet. */
export enum WalletTxnType {
  /** Money frozen on a CONFIRMED booking (positive frozen on guide wallet). */
  HOLD = 'hold',
  /** Funds released from frozen → available on COMPLETED. */
  RELEASE = 'release',
  /** Refund: frozen released back to traveler when CANCELLED. */
  REFUND = 'refund',
  /** Commission collected by admin on COMPLETED bookings. */
  COMMISSION = 'commission',
  /** Penalty paid to guide when traveler cancels late. */
  PENALTY = 'penalty',
  /** Withdrawal request — funds locked from available, awaiting admin. */
  WITHDRAW_REQUEST = 'withdraw_request',
  /** Withdrawal admin-approved — funds physically transferred out. */
  WITHDRAW_SUCCESS = 'withdraw_success',
  /** Withdrawal admin-rejected — funds returned to available. */
  WITHDRAW_REJECTED = 'withdraw_rejected',
  /** Admin manually credits a user's wallet (acts as the deposit gateway). */
  TOPUP = 'topup',
  /** Traveler pays for a booking — debits available, mirrors HOLD on guide. */
  PAYMENT = 'payment',
}

export enum WalletTxnStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet;

  @Index()
  @Column({ name: 'wallet_id' })
  walletId!: string;

  @Column({ type: 'enum', enum: WalletTxnType })
  type!: WalletTxnType;

  @Column({ type: 'enum', enum: WalletTxnStatus, default: WalletTxnStatus.SUCCESS })
  status!: WalletTxnStatus;

  /** Signed amount in wallet currency. Positive = credit, negative = debit. */
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: number;

  @Column({ length: 8, default: 'VND' })
  currency!: string;

  /** Human-readable note for ledger UIs. */
  @Column({ length: 500, nullable: true })
  note?: string;

  /** Optional related booking id, for traceability. */
  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId?: string | null;

  /** Optional bank info for withdrawals. */
  @Column({ name: 'bank_account', length: 200, nullable: true })
  bankAccount?: string;

  /**
   * Transfer code injected into the bank-transfer description. Used to match
   * incoming SePay webhooks back to the correct PENDING top-up transaction.
   * Format: `NAP_XXXXXXXX` where the body is 4 chars derived from the user
   * id + 4 random chars, e.g. `NAP_AB12CD34`.
   */
  @Index()
  @Column({ name: 'transfer_code', type: 'varchar', length: 32, nullable: true })
  transferCode?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
