import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { useAdminBulkTopUp } from '@hooks/useAdmin'
import { cn } from '@utils/cn'
import type { BulkTopUpResult } from '@services/adminService'

interface Props {
  open: boolean
  onClose: () => void
  /** Selected user ids to credit. */
  userIds: string[]
  /** Called after a successful batch so the parent can clear its selection. */
  onDone?: () => void
}

const QUICK_AMOUNTS = [100_000, 500_000, 1_000_000, 5_000_000]
const formatVnd = (n: number) => `₫${n.toLocaleString('vi-VN')}`

/**
 * Credit the same amount to many users at once. Shows a per-batch result
 * summary (succeeded / failed) returned by the bulk endpoint.
 */
export function BulkTopUpDialog({ open, onClose, userIds, onDone }: Props) {
  const [amount, setAmount] = useState<number>(500_000)
  const [note, setNote] = useState('')
  const [result, setResult] = useState<BulkTopUpResult | null>(null)
  const bulk = useAdminBulkTopUp()

  if (!open) return null

  const submit = async () => {
    if (amount < 1000 || userIds.length === 0) return
    try {
      const res = await bulk.mutateAsync({ userIds, amount, note: note || undefined })
      setResult(res)
    } catch {
      /* error surfaces via bulk.error */
    }
  }

  const close = () => {
    setResult(null)
    setAmount(500_000)
    setNote('')
    onClose()
  }

  const errorMsg =
    bulk.error &&
    (((bulk.error as { response?: { data?: { message?: string } } }).response?.data?.message) ??
      'Không nạp được, thử lại.')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur p-4">
      <div className="bg-surface-container-lowest rounded-3xl shadow-editorial-lg w-full max-w-md p-6">
        <header className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-headline font-extrabold text-lg text-on-surface">
              Nạp tiền hàng loạt
            </h3>
            <p className="text-xs text-on-surface-variant">
              {userIds.length} người dùng được chọn
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 rounded-full hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center"
            aria-label="Đóng"
          >
            <Icon name="close" />
          </button>
        </header>

        {result ? (
          <div className="text-center py-6">
            <Icon name="check_circle" className="text-primary text-4xl fill mb-2" />
            <p className="font-headline font-extrabold text-on-surface">
              Đã nạp {formatVnd(amount)} cho {result.succeeded}/{result.requested} người
            </p>
            <p className="text-sm text-on-surface-variant mt-1">
              Tổng cộng đã cộng {formatVnd(result.totalCredited)}.
            </p>
            {result.failed > 0 && (
              <div className="mt-3 text-left bg-error/10 border border-error/30 rounded-2xl p-3">
                <p className="text-sm font-bold text-error mb-1">
                  {result.failed} trường hợp lỗi:
                </p>
                <ul className="text-xs text-on-surface-variant space-y-0.5 max-h-28 overflow-y-auto">
                  {result.failures.map((f) => (
                    <li key={f.userId} className="font-mono truncate">
                      {f.userId.slice(0, 8)}… — {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              className="mt-5 w-full"
              size="lg"
              onClick={() => {
                onDone?.()
                close()
              }}
            >
              Xong
            </Button>
          </div>
        ) : (
          <>
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">
              Số tiền mỗi người (VND)
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
              placeholder="Vd: Thưởng sự kiện ra mắt"
              className="w-full px-4 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary text-sm"
            />
            {errorMsg && <p className="text-sm text-error mt-3">{errorMsg}</p>}
            <div className="mt-4 text-sm text-on-surface-variant bg-surface-container-low rounded-2xl px-4 py-2.5">
              Tổng dự kiến:{' '}
              <strong className="text-on-surface">{formatVnd(amount * userIds.length)}</strong>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="secondary" size="lg" className="flex-1" onClick={close}>
                Huỷ
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={submit}
                disabled={bulk.isPending || amount < 1000}
                isLoading={bulk.isPending}
              >
                <Icon name="payments" />
                Nạp cho {userIds.length} người
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
