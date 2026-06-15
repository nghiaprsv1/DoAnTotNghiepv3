import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { paymentService, type SepayIntent } from '@services/paymentService'

const QUICK_AMOUNTS = [200_000, 500_000, 1_000_000, 2_000_000, 5_000_000]
const VND = (n: number) => `₫${Math.round(n).toLocaleString('vi-VN')}`

/**
 * Modal that walks a traveler through depositing money into their wallet via
 * SePay. We hit POST /payments/sepay/intent to obtain a unique transfer code,
 * QR image and bank info, then poll /guides/wallet/me until SePay's webhook
 * marks the txn SUCCESS.
 */
interface SepayTopUpModalProps {
  open: boolean
  onClose: () => void
}

export function SepayTopUpModal({ open, onClose }: SepayTopUpModalProps) {
  const [amount, setAmount] = useState<number>(500_000)
  const [intent, setIntent] = useState<SepayIntent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  if (!open) return null

  const reset = () => {
    setIntent(null)
    setError(null)
    setAmount(500_000)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleCreate = async () => {
    if (amount < 10_000) {
      setError('Số tiền tối thiểu là 10.000đ')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await paymentService.createSepayIntent(amount)
      setIntent(result)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? 'Không tạo được yêu cầu nạp tiền.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      /* swallow */
    }
  }

  const handleCheck = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet', 'me'] })
  }

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4 overflow-y-auto"
      onClick={handleClose}
    >
      <div
        className="bg-surface-container-lowest rounded-t-3xl md:rounded-3xl shadow-editorial-lg p-4 md:p-6 w-full max-w-lg my-0 md:my-8 max-h-[95vh] overflow-y-auto safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3 md:mb-4 gap-3">
          <div className="min-w-0">
            <h3 className="font-headline font-extrabold text-xl md:text-2xl">Nạp tiền qua SePay</h3>
            <p className="text-xs md:text-sm text-on-surface-variant mt-1">
              Chuyển khoản theo cú pháp dưới đây, hệ thống tự động cộng số dư khi tiền về.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 w-9 h-9 rounded-full hover:bg-surface-container text-on-surface-variant flex items-center justify-center"
            aria-label="Đóng"
          >
            <Icon name="close" />
          </button>
        </div>

        {!intent ? (
          <>
            <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-2">Số tiền</p>
            <input
              type="number"
              inputMode="numeric"
              min={10000}
              step={10000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-2xl bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40 text-xl md:text-2xl font-bold mb-3"
            />
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                    amount === q
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-low border-outline/30 text-on-surface'
                  }`}
                >
                  {VND(q)}
                </button>
              ))}
            </div>
            {error && (
              <p className="text-sm text-error mb-3 inline-flex items-center gap-2">
                <Icon name="error" size={16} />
                {error}
              </p>
            )}
            <Button size="lg" rounded="full" className="w-full" onClick={handleCreate} disabled={loading}>
              <Icon name="qr_code_2" />
              {loading ? 'Đang tạo…' : 'Tạo mã chuyển khoản'}
            </Button>
          </>
        ) : (
          <IntentView intent={intent} onCopy={handleCopy} onCheck={handleCheck} onReset={reset} />
        )}
      </div>
    </div>
  )
}

function IntentView({
  intent,
  onCopy,
  onCheck,
  onReset,
}: {
  intent: SepayIntent
  onCopy: (v: string) => void
  onCheck: () => void
  onReset: () => void
}) {
  const hasBank = intent.bankAccount && intent.bankName
  return (
    <div className="space-y-4">
      {intent.qrUrl ? (
        <div className="bg-white rounded-3xl p-4 flex items-center justify-center">
          <img src={intent.qrUrl} alt="QR chuyển khoản" className="max-w-full h-auto rounded-2xl" />
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 text-sm text-amber-800">
          Chưa cấu hình tài khoản SePay (env <code>SEPAY_BANK_ACCOUNT</code>). Hệ thống vẫn đã tạo
          mã chuyển khoản, nhập đúng mã khi chuyển khoản thủ công nhé.
        </div>
      )}

      <Row label="Số tiền" value={`₫${intent.amount.toLocaleString('vi-VN')}`} onCopy={onCopy} />
      {hasBank && (
        <>
          <Row label="Ngân hàng" value={intent.bankName} onCopy={onCopy} />
          <Row label="Số tài khoản" value={intent.bankAccount} onCopy={onCopy} />
          {intent.accountHolder && (
            <Row label="Chủ tài khoản" value={intent.accountHolder} onCopy={onCopy} />
          )}
        </>
      )}
      <Row label="Nội dung CK" value={intent.transferCode} onCopy={onCopy} highlight />

      <div className="flex items-center gap-2 pt-2">
        <Button variant="secondary" size="md" rounded="full" onClick={onReset}>
          <Icon name="arrow_back" size={16} />
          Đổi số tiền
        </Button>
        <Button size="md" rounded="full" className="flex-1" onClick={onCheck}>
          <Icon name="refresh" size={16} />
          Kiểm tra giao dịch
        </Button>
      </div>
      <p className="text-xs text-on-surface-variant text-center">
        Tiền sẽ tự động vào ví khi SePay xác nhận chuyển khoản (thường &lt; 1 phút).
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  highlight,
  onCopy,
}: {
  label: string
  value: string
  highlight?: boolean
  onCopy: (v: string) => void
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
        highlight ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-surface-container-low'
      }`}
    >
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">{label}</p>
        <p className="font-headline font-extrabold text-on-surface truncate">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => onCopy(value)}
        className="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container-lowest border border-outline/30 inline-flex items-center gap-1"
      >
        <Icon name="content_copy" size={14} />
        Sao chép
      </button>
    </div>
  )
}
