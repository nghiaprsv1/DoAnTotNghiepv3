import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Avatar } from '@components/ui/Avatar'
import { useAdminTopUp } from '@hooks/useAdmin'
import { cn } from '@utils/cn'

interface Props {
  open: boolean
  onClose: () => void
  user?: {
    id: string
    name: string
    email?: string
    avatar?: string
  }
}

const QUICK_AMOUNTS = [100_000, 500_000, 1_000_000, 5_000_000]
const formatVnd = (n: number) => `₫${n.toLocaleString('vi-VN')}`

/**
 * Modal dialog admins use to credit a user's wallet. Acts as the deposit
 * gateway (no payment processor wired up).
 */
export function TopUpDialog({ open, onClose, user }: Props) {
  const [amount, setAmount] = useState<number>(500_000)
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)
  const topUp = useAdminTopUp()

  if (!open || !user) return null

  const submit = async () => {
    if (amount < 1000) return
    try {
      await topUp.mutateAsync({ userId: user.id, amount, note: note || undefined })
      setDone(true)
      setTimeout(() => {
        setDone(false)
        setAmount(500_000)
        setNote('')
        onClose()
      }, 1500)
    } catch {
      // error surfaces via topUp.error
    }
  }

  const errorMsg =
    topUp.error &&
    (((topUp.error as { response?: { data?: { message?: string } } }).response?.data?.message) ??
      'Không nạp được, thử lại.')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur p-4">
      <div className="bg-surface-container-lowest rounded-3xl shadow-editorial-lg w-full max-w-md p-6">
        <header className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar ?? ''} alt={user.name} size="md" ring />
            <div>
              <h3 className="font-headline font-extrabold text-lg text-on-surface">
                Nạp tiền cho {user.name}
              </h3>
              {user.email && (
                <p className="text-xs text-on-surface-variant">{user.email}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center"
            aria-label="Đóng"
          >
            <Icon name="close" />
          </button>
        </header>

        {done ? (
          <div className="text-center py-8">
            <Icon name="check_circle" className="text-primary text-4xl fill mb-2" />
            <p className="font-headline font-extrabold text-on-surface">
              Đã nạp {formatVnd(amount)}
            </p>
            <p className="text-sm text-on-surface-variant">Số dư khả dụng đã được cập nhật.</p>
          </div>
        ) : (
          <>
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">
              Số tiền (VND)
            </label>
            <input
              type="number"
              min={1000}
              step={10_000}
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-lg font-headline font-extrabold outline-none focus:border-primary"
            />

            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold transition border',
                    amount === q
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:border-primary/40',
                  )}
                >
                  +{formatVnd(q)}
                </button>
              ))}
            </div>

            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-4 mb-1.5">
              Ghi chú (tuỳ chọn)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Vd: Hỗ trợ chiến dịch khuyến mãi T5"
              className="w-full px-4 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary text-sm"
            />

            {errorMsg && <p className="text-sm text-error mt-3">{errorMsg}</p>}

            <div className="flex gap-2 mt-5">
              <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
                Huỷ
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={submit}
                disabled={topUp.isPending || amount < 1000}
                isLoading={topUp.isPending}
              >
                <Icon name="add_circle" />
                Nạp {formatVnd(amount)}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
