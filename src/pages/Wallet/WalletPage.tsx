import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useMyWallet } from '@hooks/useWallet'
import { cn } from '@utils/cn'
import type { WalletTransaction, WalletTxnType } from '@services/walletService'
import { SepayTopUpModal } from './components/SepayTopUpModal'

const TXN_LABEL: Record<WalletTxnType, string> = {
  hold: 'Tạm giữ (HDV)',
  release: 'Giải ngân (HDV)',
  refund: 'Hoàn tiền',
  commission: 'Hoa hồng nền tảng',
  penalty: 'Phí huỷ trễ',
  withdraw_request: 'Yêu cầu rút tiền',
  withdraw_success: 'Rút tiền thành công',
  withdraw_rejected: 'Rút tiền bị từ chối',
  topup: 'Admin nạp tiền',
  payment: 'Thanh toán booking',
}

const TXN_ICON: Record<WalletTxnType, string> = {
  hold: 'lock_clock',
  release: 'lock_open',
  refund: 'undo',
  commission: 'percent',
  penalty: 'gavel',
  withdraw_request: 'schedule',
  withdraw_success: 'check_circle',
  withdraw_rejected: 'cancel',
  topup: 'add_circle',
  payment: 'shopping_cart_checkout',
}

const VND = (n: number) => `₫${Math.round(n).toLocaleString('vi-VN')}`

/**
 * Personal wallet page for traveler users. Shows available balance, lifetime
 * top-ups, and the full ledger so users can audit money in/out. There is no
 * self-deposit — they need an admin to credit their account.
 */
export function WalletPage() {
  const { data, isLoading, error } = useMyWallet()
  const [topUpOpen, setTopUpOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto container-page py-8 md:py-12">
        <LoadingState count={3} />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto container-page py-10 md:py-16">
        <EmptyState icon="error_outline" title="Không tải được ví" description="Thử lại sau." />
      </div>
    )
  }

  const available = Number(data.wallet.balanceAvailable)
  const frozen = Number(data.wallet.balanceFrozen)
  // CHỈ tính giao dịch nạp ĐÃ THÀNH CÔNG. Intent SePay tạo sẵn một bản ghi
  // topup PENDING (chưa có tiền thật, chờ webhook), nếu cộng cả PENDING thì
  // "Đã được nạp" tăng ngay khi bấm nạp dù tiền chưa về → sai lệch.
  const totalTopUp = data.transactions
    .filter((t) => t.type === 'topup' && t.status === 'success')
    .reduce((s, t) => s + Number(t.amount), 0)
  const totalSpent = data.transactions
    .filter((t) => t.type === 'payment' && t.status === 'success')
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)

  return (
    <div className="max-w-4xl mx-auto container-page py-4 md:py-6 space-y-4 md:space-y-6">
      <header>
        <h1 className="font-headline font-extrabold text-xl md:text-2xl text-on-surface">Ví của tôi</h1>
        <p className="text-xs md:text-sm text-on-surface-variant mt-1">
          Số dư khả dụng dùng để thanh toán booking. Bạn có thể nạp tiền qua chuyển khoản SePay,
          tiền sẽ được tự động cộng vào ví khi giao dịch hoàn tất.
        </p>
      </header>

      <div className="flex justify-stretch md:justify-end">
        <Button size="md" rounded="full" onClick={() => setTopUpOpen(true)} className="w-full md:w-auto">
          <Icon name="add_circle" />
          Nạp qua SePay
        </Button>
      </div>

      <section className="grid grid-cols-1 xs:grid-cols-3 gap-3 md:gap-4">
        <Card icon="account_balance_wallet" tone="primary" label="Khả dụng" value={VND(available)} />
        <Card icon="lock_clock" tone="amber" label="Đang giữ" value={VND(frozen)} />
        <Card
          icon="add_circle"
          tone="green"
          label="Đã được nạp"
          value={VND(totalTopUp)}
          hint={`Tổng đ�� chi: ${VND(totalSpent)}`}
        />
      </section>

      <section className="bg-amber-500/10 border border-amber-500/30 rounded-2xl md:rounded-3xl px-4 md:px-5 py-3 md:py-4 text-xs md:text-sm">
        <p className="font-bold text-amber-800 mb-1 inline-flex items-center gap-2">
          <Icon name="info" size={16} /> Cách nạp tiền
        </p>
        <p className="text-on-surface-variant">
          Bấm <b>"Nạp qua SePay"</b> để lấy mã chuyển khoản + QR. Sau khi bạn chuyển khoản,
          hệ thống sẽ nhận webhook từ SePay và cộng số dư trong vài phút.
        </p>
      </section>

      <section>
        <h3 className="font-headline font-extrabold text-lg text-on-surface mb-3">
          Lịch sử giao dịch ({data.transactions.length})
        </h3>
        {data.transactions.length === 0 ? (
          <EmptyState
            icon="receipt_long"
            title="Chưa có giao dịch"
            description="Khi admin nạp tiền hoặc bạn thanh toán booking, ví sẽ ghi nhận tại đây."
          />
        ) : (
          <ul className="space-y-2">
            {data.transactions.map((t) => (
              <TxnRow key={t.id} txn={t} />
            ))}
          </ul>
        )}
      </section>

      <SepayTopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </div>
  )
}

function Card({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: string
  tone: 'primary' | 'amber' | 'green'
  label: string
  value: string
  hint?: string
}) {
  const tones: Record<typeof tone, string> = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-500/15 text-amber-700',
    green: 'bg-green-500/15 text-green-700',
  }
  return (
    <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5">
      <span className={cn('w-10 h-10 rounded-2xl flex items-center justify-center mb-3', tones[tone])}>
        <Icon name={icon} />
      </span>
      <p className="text-xs uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="font-headline font-extrabold text-3xl text-on-surface mt-1">{value}</p>
      {hint && <p className="text-xs text-on-surface-variant mt-2">{hint}</p>}
    </div>
  )
}

function TxnRow({ txn }: { txn: WalletTransaction }) {
  const positive = Number(txn.amount) >= 0
  return (
    <li className="bg-surface-container-lowest rounded-2xl px-4 py-3 flex items-center gap-3 shadow-editorial">
      <span
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center',
          positive ? 'bg-green-500/15 text-green-700' : 'bg-error/10 text-error',
        )}
      >
        <Icon name={TXN_ICON[txn.type] ?? 'sync_alt'} size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-headline font-bold text-sm text-on-surface truncate">
          {TXN_LABEL[txn.type]}
        </p>
        <p className="text-xs text-on-surface-variant">
          {new Date(txn.createdAt).toLocaleString('vi-VN')}
          {txn.note ? ` · ${txn.note}` : ''}
        </p>
      </div>
      <p
        className={cn(
          'font-headline font-extrabold text-base',
          positive ? 'text-green-700' : 'text-error',
        )}
      >
        {positive ? '+' : ''}
        {VND(Number(txn.amount))}
      </p>
    </li>
  )
}
