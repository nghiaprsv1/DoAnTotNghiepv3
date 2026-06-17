import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wallet } from '@/modules/guide/entities/wallet.entity';
import {
  WalletTransaction,
  WalletTxnStatus,
  WalletTxnType,
} from '@/modules/guide/entities/wallet-transaction.entity';
import { User } from '@/modules/user/entities/user.entity';
import { NotificationsService } from '@/modules/notification/notifications.service';
import { NotificationType } from '@/modules/notification/entities/notification.entity';

/**
 * SePay integration. Two flows:
 *  1. createIntent(userId, amount) → returns a payment QR + bank info + a
 *     unique transfer code (`NAP_XXXXXXXX`). We persist a PENDING wallet
 *     transaction so we can match the webhook later.
 *  2. handleWebhook(token, payload) → SePay POSTs here when a transfer is
 *     received. We:
 *       - verify the API key
 *       - extract the NAP_... code from the description
 *       - look up the matching PENDING transaction
 *       - **verify the transferred amount equals the requested amount**
 *       - mark the txn SUCCESS, credit the wallet, push a notification.
 *     Idempotent: re-deliveries hit a PENDING-only filter so they no-op.
 *
 * Falls back gracefully when env vars are missing — intent still gets a code,
 * UI just shows "configure SePay" instead of a working QR.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Wallet) private readonly wallets: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly txns: Repository<WalletTransaction>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Bank info shown to the FE so the user can transfer money. */
  getBankInfo() {
    return {
      bankAccount: this.config.get<string>('SEPAY_BANK_ACCOUNT') ?? '',
      bankName: this.config.get<string>('SEPAY_BANK_NAME') ?? '',
      accountHolder: this.config.get<string>('SEPAY_ACCOUNT_HOLDER') ?? '',
    };
  }

  /**
   * Create a deposit intent. The user transfers `amount` VND to the bank
   * account, including the returned `transferCode` in the description. SePay's
   * webhook later credits the wallet.
   */
  async createIntent(
    userId: string,
    amount: number,
  ): Promise<{
    transferCode: string
    amount: number
    bankAccount: string
    bankName: string
    accountHolder: string
    qrUrl: string | null
    txnId: string
  }> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const code = this.makeTransferCode(userId);

    const txn = await this.dataSource.transaction(async (m) => {
      const wallet = await this.ensureWallet(m.getRepository(Wallet), userId);
      return m.getRepository(WalletTransaction).save(
        m.getRepository(WalletTransaction).create({
          walletId: wallet.id,
          type: WalletTxnType.TOPUP,
          status: WalletTxnStatus.PENDING,
          amount,
          currency: wallet.currency,
          note: `Yêu cầu nạp qua SePay (${code})`,
          transferCode: code,
        }),
      );
    });
    const info = this.getBankInfo();
    return {
      transferCode: code,
      amount,
      ...info,
      qrUrl: this.buildQrUrl(amount, code),
      txnId: txn.id,
    };
  }

  /**
   * Verify the webhook signature/key and credit the wallet. Returns the
   * matched transaction or null if nothing was matched (idempotent).
   */
  async handleWebhook(
    authHeader: string | undefined,
    payload: SepayWebhookPayload,
  ): Promise<WalletTransaction | null> {
    const expected = this.config.get<string>('SEPAY_WEBHOOK_TOKEN');
    if (expected) {
      const provided = authHeader?.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '');
      if (provided !== expected) {
        throw new UnauthorizedException('Invalid SePay webhook token');
      }
    }
    // SePay only delivers credit transfers ("in"); ignore outbound just in case.
    if (payload.transferType && payload.transferType !== 'in') {
      this.logger.warn(`SePay webhook ignored: transferType=${payload.transferType}`);
      return null;
    }

    const description = (payload.content ?? payload.description ?? '').toString();
    const code = this.extractTransferCode(description);
    if (!code) {
      this.logger.warn(`SePay webhook with no code: ${description.slice(0, 120)}`);
      return null;
    }
    const receivedAmount = Number(payload.transferAmount ?? payload.amount ?? 0);
    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      this.logger.warn(`SePay webhook with bad amount: ${payload.transferAmount}`);
      return null;
    }

    const result = await this.dataSource.transaction(async (m) => {
      const txnRepo = m.getRepository(WalletTransaction);
      // Idempotency: only match PENDING rows. A retried delivery for an
      // already-SUCCESS txn falls through and we return null below.
      // So khớp mã đã CHUẨN HOÁ: bỏ "_" ở cột DB (mã sinh ra có "_", nội dung
      // CK ngân hàng có thể đã lọc mất "_") để hai bên luôn khớp.
      const pending = await txnRepo
        .createQueryBuilder('t')
        .where("REPLACE(t.transfer_code, '_', '') = :code", { code })
        .andWhere('t.type = :type', { type: WalletTxnType.TOPUP })
        .andWhere('t.status = :status', { status: WalletTxnStatus.PENDING })
        .getOne();
      if (!pending) {
        this.logger.warn(`SePay webhook: no pending intent for code ${code}`);
        return null;
      }

      // Strict amount check — refuse partial / inflated transfers. The user can
      // request a fresh intent if they sent the wrong amount.
      const expectedAmount = Number(pending.amount);
      if (Math.round(receivedAmount) !== Math.round(expectedAmount)) {
        pending.status = WalletTxnStatus.FAILED;
        pending.note =
          `Sai số tiền: yêu cầu ${expectedAmount}, nhận ${receivedAmount}` +
          ` (ref ${payload.referenceCode ?? payload.id ?? ''})`;
        await txnRepo.save(pending);
        this.logger.warn(
          `SePay amount mismatch on ${code}: expected ${expectedAmount}, got ${receivedAmount}`,
        );
        return { txn: pending, mismatch: true };
      }

      const wallet = await m.getRepository(Wallet).findOneByOrFail({ id: pending.walletId });
      wallet.balanceAvailable = Number(wallet.balanceAvailable) + receivedAmount;
      await m.getRepository(Wallet).save(wallet);
      pending.status = WalletTxnStatus.SUCCESS;
      pending.note = `Nạp tiền thành công qua SePay (ref ${payload.referenceCode ?? payload.id ?? ''})`;
      const saved = await txnRepo.save(pending);
      return { txn: saved, mismatch: false, walletUserId: wallet.userId };
    });

    if (!result) return null;
    // Best-effort notification — don't fail the webhook if push throws.
    void this.pushTopupNotification(result).catch((err) =>
      this.logger.warn(`Topup notification failed: ${(err as Error).message}`),
    );
    return result.txn;
  }

  private async pushTopupNotification(result: {
    txn: WalletTransaction
    mismatch: boolean
    walletUserId?: string
  }) {
    if (!result.walletUserId && result.mismatch) {
      // Need a userId — load from wallet if missing.
      const w = await this.wallets.findOne({ where: { id: result.txn.walletId } });
      if (!w) return;
      result.walletUserId = w.userId;
    }
    const userId = result.walletUserId;
    if (!userId) return;
    const amount = Number(result.txn.amount);
    if (result.mismatch) {
      await this.notifications.push({
        userId,
        type: NotificationType.SYSTEM,
        title: 'Nạp tiền không thành công',
        preview: `Số tiền chuyển khoản không khớp với yêu cầu (${amount.toLocaleString('vi-VN')}đ).`,
        ctaLabel: 'Mở ví',
        ctaHref: '/wallet',
      });
    } else {
      await this.notifications.push({
        userId,
        type: NotificationType.SYSTEM,
        title: 'Nạp tiền thành công',
        preview: `Đã cộng ${amount.toLocaleString('vi-VN')}đ vào ví qua SePay.`,
        ctaLabel: 'Mở ví',
        ctaHref: '/wallet',
      });
    }
  }

  /**
   * Encode `NAP_<userPrefix><rand>`. 4 chars from user id keeps codes short
   * but distinct, 4 random chars give uniqueness. Length always 12.
   */
  private makeTransferCode(userId: string): string {
    const prefix = userId.replace(/-/g, '').slice(0, 4).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `NAP_${prefix}${rand}`;
  }

  /**
   * Find the NAP transfer code in the bank's description. Một số ngân hàng
   * (vd MBBank) LỌC BỎ dấu "_" trong nội dung CK, nên mã "NAP_461BK1U9" về
   * thành "NAP461BK1U9". Chấp nhận cả 2 dạng (có/không "_"), trả về dạng đã
   * CHUẨN HOÁ (bỏ "_", in hoa) để so khớp nhất quán.
   */
  private extractTransferCode(text: string): string | null {
    const upper = text.toUpperCase();
    // Ưu tiên dạng có "_"; nếu không có thì bắt dạng liền (NAP + 8 ký tự).
    const match =
      upper.match(/NAP_?[A-Z0-9]{8}/)?.[0] ?? null;
    if (!match) return null;
    return match.replace(/_/g, ''); // chuẩn hoá: "NAP_461BK1U9" → "NAP461BK1U9"
  }

  /**
   * Build a QR URL using SePay's free QR endpoint. If bank/account aren't
   * configured we return null so the FE can show a placeholder.
   */
  private buildQrUrl(amount: number, code: string): string | null {
    const account = this.config.get<string>('SEPAY_BANK_ACCOUNT');
    const bank = this.config.get<string>('SEPAY_BANK_NAME');
    if (!account || !bank) return null;
    const params = new URLSearchParams({
      acc: account,
      bank,
      amount: String(amount),
      des: code,
    });
    return `https://qr.sepay.vn/img?${params.toString()}`;
  }

  private async ensureWallet(repo: Repository<Wallet>, userId: string): Promise<Wallet> {
    const w = await repo.findOne({ where: { userId } });
    if (w) return w;
    return repo.save(repo.create({ userId, balanceAvailable: 0, balanceFrozen: 0 }));
  }
}

/** Loose shape — SePay docs vary, accept multiple field names. */
export interface SepayWebhookPayload {
  id?: string | number
  referenceCode?: string
  description?: string
  content?: string
  amount?: number | string
  transferAmount?: number | string
  transferType?: 'in' | 'out'
}
