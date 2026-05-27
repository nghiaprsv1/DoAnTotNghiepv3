import { useMemo } from 'react'
import { Icon } from '@components/ui/Icon'
import { mockBookings, mockPayouts, mockRevenueByMonth } from '@constants/mockGuideDashboard'
import { StatCard } from './components/StatCard'
import { RevenueChart } from './components/RevenueChart'
import { cn } from '@utils/cn'

const platformFeeRate = 0.15

export function RevenueTab() {
  const grossRevenue = useMemo(
    () => mockRevenueByMonth.reduce((s, m) => s + m.amount, 0),
    []
  )
  const platformFee = grossRevenue * platformFeeRate
  const netRevenue = grossRevenue - platformFee

  const completedBookings = mockBookings.filter((b) => b.status === 'completed').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="payments"
          label="Tổng doanh thu"
          value={`₫${grossRevenue.toLocaleString('vi-VN')}`}
          tone="primary"
        />
        <StatCard
          icon="account_balance_wallet"
          label="Doanh thu thực nhận"
          value={`₫${netRevenue.toLocaleString('vi-VN')}`}
          delta={{ value: '+18%', positive: true }}
        />
        <StatCard
          icon="receipt_long"
          label={`Phí TravelSocial (${platformFeeRate * 100}%)`}
          value={`₫${platformFee.toLocaleString('vi-VN')}`}
        />
        <StatCard
          icon="event_available"
          label="Tour đã hoàn thành"
          value={`${completedBookings}`}
        />
      </div>

      <RevenueChart data={mockRevenueByMonth} />

      {/* Payout history */}
      <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5 md:p-6">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-headline font-extrabold text-lg text-on-surface">
              Lịch sử thanh toán
            </h3>
            <p className="text-xs text-on-surface-variant">
              TravelSocial chuyển khoản vào ngày 1 và 15 hằng tháng.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-headline font-bold editorial-gradient text-on-primary shadow-editorial active:scale-95 transition"
          >
            <Icon name="download" size={16} />
            Xuất CSV
          </button>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/15">
                <th className="py-3 pr-4">Mã</th>
                <th className="py-3 pr-4">Ngày</th>
                <th className="py-3 pr-4">Phương thức</th>
                <th className="py-3 pr-4 text-right">Số tiền</th>
                <th className="py-3 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {mockPayouts.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-low/50 transition"
                >
                  <td className="py-3 pr-4 font-mono text-on-surface-variant">{p.id.toUpperCase()}</td>
                  <td className="py-3 pr-4 text-on-surface">{p.date}</td>
                  <td className="py-3 pr-4 text-on-surface-variant truncate max-w-[200px]">
                    {p.method}
                  </td>
                  <td className="py-3 pr-4 text-right font-headline font-extrabold text-on-surface">
                    ₫{p.amount.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        p.status === 'paid' && 'bg-green-500/15 text-green-700',
                        p.status === 'processing' && 'bg-amber-500/15 text-amber-700',
                        p.status === 'failed' && 'bg-error/10 text-error'
                      )}
                    >
                      {p.status === 'paid' && 'Đã thanh toán'}
                      {p.status === 'processing' && 'Đang xử lý'}
                      {p.status === 'failed' && 'Thất bại'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bank info */}
      <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5 md:p-6">
        <header className="flex items-center justify-between mb-4">
          <h3 className="font-headline font-extrabold text-lg text-on-surface">
            Tài khoản nhận tiền
          </h3>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-primary font-bold hover:underline"
          >
            <Icon name="edit" size={14} />
            Chỉnh sửa
          </button>
        </header>
        <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl">
          <span className="w-12 h-12 rounded-xl editorial-gradient text-on-primary flex items-center justify-center">
            <Icon name="account_balance" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-headline font-bold text-on-surface">
              Vietcombank · Linh Nguyễn
            </p>
            <p className="text-xs text-on-surface-variant">Số tài khoản: ****1234</p>
          </div>
          <Icon name="verified" className="text-primary fill" />
        </div>
      </section>
    </div>
  )
}
