import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Button } from '@components/ui/Button'
import { useGuideRevenueDetail } from '@hooks/useAdmin'
import { cn } from '@utils/cn'

interface Props {
  open: boolean
  onClose: () => void
  /** Guide PROFILE id (not user id). */
  guideId?: string
}

const formatVnd = (n: number) => `₫${Math.round(Number(n)).toLocaleString('vi-VN')}`

const STATUS_TONE: Record<string, string> = {
  completed: 'bg-green-500/15 text-green-700',
  confirmed: 'bg-primary/10 text-primary',
  cancelled: 'bg-error/10 text-error',
  rejected: 'bg-error/10 text-error',
  expired: 'bg-surface-container-high text-on-surface-variant',
}

/** Detailed revenue breakdown for a single guide, opened from the revenue page. */
export function GuideRevenueDialog({ open, onClose, guideId }: Props) {
  const { data, isLoading } = useGuideRevenueDetail(open ? guideId : undefined)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur p-0 md:p-4">
      <div className="bg-surface-container-lowest rounded-t-3xl md:rounded-3xl shadow-editorial-lg w-full max-w-2xl max-h-[92vh] overflow-y-auto safe-bottom">
        <header className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur flex items-start justify-between gap-3 px-5 md:px-6 py-4 border-b border-outline-variant/15">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={data?.guide.avatar ?? ''} alt={data?.guide.name ?? ''} size="md" ring />
            <div className="min-w-0">
              <h3 className="font-headline font-extrabold text-lg text-on-surface truncate">
                {data?.guide.name ?? 'Đang tải…'}
              </h3>
              <p className="text-xs text-on-surface-variant truncate">{data?.guide.region}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center"
            aria-label="Đóng"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="p-5 md:p-6 space-y-5">
          {isLoading || !data ? (
            <div className="h-48 rounded-2xl bg-surface-container-low animate-pulse" />
          ) : (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Kpi label="Tổng doanh thu" value={formatVnd(data.summary.grossRevenue)} tone="primary" />
                <Kpi label="HDV thực nhận" value={formatVnd(data.summary.netEarnings)} tone="green" />
                <Kpi label="Hoa hồng (10%)" value={formatVnd(data.summary.commission)} tone="amber" />
                <Kpi label="Tổng booking" value={String(data.summary.totalBookings)} tone="blue" />
                <Kpi label="Hoàn thành" value={String(data.summary.completedBookings)} tone="green" />
                <Kpi label="Huỷ / từ chối" value={String(data.summary.cancelledBookings)} tone="error" />
              </div>

              {/* Booking ledger */}
              <div>
                <h4 className="font-headline font-extrabold text-on-surface mb-2">
                  Lịch sử booking ({data.bookings.length})
                </h4>
                {data.bookings.length === 0 ? (
                  <p className="text-sm text-on-surface-variant italic">Chưa có booking nào.</p>
                ) : (
                  <div className="overflow-x-auto -mx-1">
                    <table className="min-w-full text-sm">
                      <thead className="text-on-surface-variant text-xs uppercase tracking-widest">
                        <tr>
                          <th className="text-left p-2">Tour · Điểm đến</th>
                          <th className="text-left p-2">Ngày</th>
                          <th className="text-right p-2">Số tiền</th>
                          <th className="text-center p-2">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.bookings.map((b) => (
                          <tr key={b.id} className="border-t border-outline-variant/10">
                            <td className="p-2">
                              <p className="font-bold text-on-surface truncate max-w-[12rem]">
                                {b.tourTitle}
                              </p>
                              <p className="text-xs text-on-surface-variant">{b.destination}</p>
                            </td>
                            <td className="p-2 text-xs text-on-surface-variant whitespace-nowrap">
                              {new Date(b.startDate).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="p-2 text-right font-bold text-on-surface whitespace-nowrap">
                              {formatVnd(b.amount)}
                            </td>
                            <td className="p-2 text-center">
                              <span
                                className={cn(
                                  'inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                                  STATUS_TONE[b.status] ?? 'bg-surface-container-high text-on-surface-variant',
                                )}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <Button variant="secondary" size="lg" className="w-full" onClick={onClose}>
                Đóng
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const TONES: Record<string, string> = {
  primary: 'text-primary',
  green: 'text-green-700',
  amber: 'text-amber-700',
  blue: 'text-blue-700',
  error: 'text-error',
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: keyof typeof TONES }) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-3">
      <p className={cn('font-headline font-extrabold text-lg', TONES[tone])}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</p>
    </div>
  )
}
