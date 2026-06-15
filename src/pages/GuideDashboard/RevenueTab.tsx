import { useMemo, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useMyWallet, useRequestWithdrawal } from '@hooks/useWallet'
import { useMyBookingsAsGuide } from '@hooks/useBookings'
import { RevenueChart } from './components/RevenueChart'
import { cn } from '@utils/cn'
import type { WalletTransaction, WalletTxnType } from '@services/walletService'
import type { RevenueMonth } from '@types/guideDashboard'

const TXN_LABEL: Record<WalletTxnType, string> = {
  hold: 'Tạm giữ (booking xác nhận)',
  release: 'Giải ngân về khả dụng',
  refund: 'Hoàn tiền cho khách',
  commission: 'Hoa hồng nền tảng',
  penalty: 'Bồi thường khách',
  withdraw_request: 'Yêu cầu rút tiền',
  withdraw_success: 'Rút tiền thành công',
  withdraw_rejected: 'Rút tiền bị từ chối',
  topup: 'Admin nạp tiền',
  payment: 'Thanh toán booking',
}

const formatVnd = (n: number) => `₫${Number(n).toLocaleString('vi-VN')}`

export function RevenueTab() {
  const { data, isLoading, error } = useMyWallet()
  const { data: bookings } = useMyBookingsAsGuide()
  const withdraw = useRequestWithdrawal()

  const [amount, setAmount] = useState<number>(0)
  const [bankAccount, setBankAccount] = useState<string>('')
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  // Aggregate monthly revenue (guide-side, post-commission) for the past 6 months.
  const series = useMemo<RevenueMonth[]>(() => {
    const months: RevenueMonth[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ month: `T${d.getMonth() + 1}`, amount: 0, bookings: 0 })
    }
    ;(bookings ?? []).forEach((b) => {
      if (b.status !== 'completed') return
      const d = new Date(b.createdAt)
      const idx =
        (d.getFullYear() - now.getFullYear()) * 12 +
        (d.getMonth() - now.getMonth()) +
        5
      if (idx >= 0 && idx < months.length) {
        months[idx].amount += b.amount * 0.9
        months[idx].bookings += 1
      }
    })
    return months
  }, [bookings])

  const completed = (bookings ?? []).filter((b) => b.status === 'completed')
  const totalGross = completed.reduce((s, b) => s + b.amount, 0)
  const totalNet = totalGross * 0.9
  const totalCommission = totalGross * 0.1

  if (isLoading) {
    return <LoadingState count={3} />
  }
  if (error || !data) {
    return (
      <EmptyState
        icon="error_outline"
        title="Không tải được ví"
        description="Hãy thử lại sau ít phút."
      />
    )
  }

  const { wallet, transactions } = data
  const available = Number(wallet.balanceAvailable)
  const frozen = Number(wallet.balanceFrozen)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    if (amount <= 0 || amount > available) {
      setFeedback({ kind: 'err', msg: 'Số tiền không hợp lệ.' })
      return
    }
    try {
      await withdraw.mutateAsync({ amount, bankAccount: bankAccount || undefined })
      setFeedback({ kind: 'ok', msg: 'Đã gửi yêu cầu rút tiền. Admin sẽ xét duyệt sớm.' })
      setAmount(0)
      setBankAccount('')
    } catch (err: any) {
      setFeedback({
        kind: 'err',
        msg: err?.response?.data?.message ?? 'Không thể gửi yêu cầu. Thử lại sau.',
      })
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-headline font-extrabold text-2xl text-on-surface">Doanh thu & Ví</h2>
        <p className="text-sm text-on-surface-variant">
          Số dư khả dụng có thể rút về tài khoản. Số dư giữ là tiền đang chờ chuyến đi hoàn thành.
        </p>
      </header>

      {/* Balance cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard
          tone="primary"
          icon="account_balance_wallet"
          label="Khả dụng"
          value={formatVnd(available)}
          hint="Có thể yêu cầu rút về ngân hàng"
        />
        <BalanceCard
          tone="amber"
          icon="lock_clock"
          label="Đang giữ"
          value={formatVnd(frozen)}
          hint="Chờ chuyến đi hoàn thành"
        />
        <BalanceCard
          tone="primary"
          icon="trending_up"
          label="Doanh thu thực nhận"
          value={formatVnd(totalNet)}
          hint={`Sau khi trừ 10% phí (${completed.length} tour)`}
        />
        <BalanceCard
          tone="amber"
          icon="receipt_long"
          label="Phí nền tảng đã đóng"
          value={formatVnd(totalCommission)}
          hint="10% trên tổng tour hoàn thành"
        />
      </section>

      {/* Monthly revenue chart */}
      <RevenueChart data={series} />

      {/* Commission explainer */}
      <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5 md:p-6">
        <h3 className="font-headline font-extrabold text-lg text-on-surface mb-1">
          Cách tính doanh thu
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Khi khách đặt và thanh toán: tiền vào ví <b>"Đang giữ"</b>. Khi tour hoàn thành: 90% chuyển vào <b>"Khả dụng"</b>, 10% là phí nền tảng.
        </p>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <ExplainerStep
            icon="event_available"
            title="Bước 1"
            text="Tour đã thanh toán → tiền tạm giữ"
            color="amber"
          />
          <ExplainerStep
            icon="task_alt"
            title="Bước 2"
            text="Hoàn thành → 90% giải ngân, 10% phí web"
            color="primary"
          />
          <ExplainerStep
            icon="account_balance"
            title="Bước 3"
            text="Yêu cầu rút tiền → admin chuyển khoản"
            color="green"
          />
        </div>
      </section>

      {/* Withdraw form */}
      <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5 md:p-6">
        <h3 className="font-headline font-extrabold text-lg text-on-surface mb-1">Rút tiền</h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Gửi yêu cầu rút. Admin xét duyệt thường trong 24-48 giờ.
        </p>
        <form onSubmit={submit} className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label className="text-sm">
            <span className="block text-on-surface-variant mb-1">Số tiền (VND)</span>
            <input
              type="number"
              min={1}
              max={available}
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0"
              className="w-full px-4 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm">
            <span className="block text-on-surface-variant mb-1">Tài khoản nhận (tuỳ chọn)</span>
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="Vietcombank — 0123456789 — Nguyen Van A"
              className="w-full px-4 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary"
            />
          </label>
          <Button
            type="submit"
            size="md"
            rounded="full"
            disabled={withdraw.isPending || amount <= 0 || amount > available}
          >
            {withdraw.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}
          </Button>
        </form>
        {feedback && (
          <p
            className={cn(
              'mt-3 text-sm',
              feedback.kind === 'ok' ? 'text-green-700' : 'text-error',
            )}
          >
            {feedback.msg}
          </p>
        )}
      </section>

      {/* Transactions */}
      <section>
        <h3 className="font-headline font-extrabold text-lg text-on-surface mb-3">Lịch sử giao dịch</h3>
        {transactions.length === 0 ? (
          <EmptyState
            icon="receipt_long"
            title="Chưa có giao dịch"
            description="Khi bạn nhận booking và hoàn thành chuyến đi, ví sẽ ghi nhận tại đây."
          />
        ) : (
          <ul className="space-y-2">
            {transactions.map((t) => (
              <TxnRow key={t.id} txn={t} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function BalanceCard({
  tone,
  icon,
  label,
  value,
  hint,
}: {
  tone: 'primary' | 'amber'
  icon: string
  label: string
  value: string
  hint: string
}) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-500/15 text-amber-700',
  }
  return (
    <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5">
      <span className={cn('w-10 h-10 rounded-2xl flex items-center justify-center mb-3', tones[tone])}>
        <Icon name={icon} />
      </span>
      <p className="text-xs uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="font-headline font-extrabold text-3xl text-on-surface mt-1">{value}</p>
      <p className="text-xs text-on-surface-variant mt-2">{hint}</p>
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
        <Icon name={positive ? 'arrow_downward' : 'arrow_upward'} size={18} />
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
      <div className="text-right">
        <p className={cn('font-headline font-extrabold text-base', positive ? 'text-green-700' : 'text-error')}>
          {positive ? '+' : ''}
          {formatVnd(Number(txn.amount))}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{txn.status}</p>
      </div>
    </li>
  )
}

function ExplainerStep({
  icon,
  title,
  text,
  color,
}: {
  icon: string
  title: string
  text: string
  color: 'amber' | 'primary' | 'green'
}) {
  const tones: Record<'amber' | 'primary' | 'green', string> = {
    amber: 'bg-amber-500/15 text-amber-700',
    primary: 'bg-primary/15 text-primary',
    green: 'bg-green-500/15 text-green-700',
  }
  return (
    <div className="rounded-2xl bg-surface-container-low px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={cn('w-7 h-7 rounded-xl flex items-center justify-center', tones[color])}>
          <Icon name={icon} size={16} />
        </span>
        <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">{title}</p>
      </div>
      <p className="text-sm text-on-surface">{text}</p>
    </div>
  )
}

