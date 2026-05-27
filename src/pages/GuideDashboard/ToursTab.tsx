import { Icon } from '@components/ui/Icon'
import { mockDashboardTours } from '@constants/mockGuideDashboard'
import { cn } from '@utils/cn'
import type { DashboardTour } from '@constants/mockGuideDashboard'

const statusStyles: Record<DashboardTour['status'], { label: string; cls: string }> = {
  active: { label: 'Hoạt động', cls: 'bg-green-500/15 text-green-700' },
  paused: { label: 'Tạm dừng', cls: 'bg-amber-500/15 text-amber-700' },
  draft: { label: 'Bản nháp', cls: 'bg-surface-container-high text-on-surface-variant' },
}

export function ToursTab() {
  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-headline font-extrabold text-2xl text-on-surface">
            Tour của bạn
          </h2>
          <p className="text-sm text-on-surface-variant">
            Quản lý các gói tour bạn cung cấp. Bật/tắt hoặc chỉnh giá bất cứ lúc nào.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-headline font-bold editorial-gradient text-on-primary shadow-editorial active:scale-95 transition"
        >
          <Icon name="add" size={18} />
          Tạo tour mới
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {mockDashboardTours.map((t) => (
          <article
            key={t.id}
            className="bg-surface-container-lowest rounded-3xl shadow-editorial overflow-hidden flex flex-col"
          >
            <div className="relative h-40 overflow-hidden">
              <img src={t.coverImage} alt={t.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-primary">
                {t.category}
              </span>
              <span
                className={cn(
                  'absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                  statusStyles[t.status].cls
                )}
              >
                {statusStyles[t.status].label}
              </span>
              <p className="absolute bottom-3 left-3 right-3 text-white font-headline font-extrabold text-lg leading-tight line-clamp-2">
                {t.title}
              </p>
            </div>

            <div className="p-4 flex flex-col flex-grow">
              <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-1">
                  <Icon name="location_on" size={14} />
                  {t.destination}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="event" size={14} />
                  {t.bookingsCount} booking
                </span>
                {t.rating > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="star" size={14} className="text-primary fill" />
                    {t.rating.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-end justify-between gap-3 pt-3 border-t border-outline-variant/15">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Giá / ngày
                  </p>
                  <p className="text-lg font-extrabold text-on-surface font-headline">
                    ₫{t.pricePerDay.toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <ActionBtn icon="bar_chart" label="Thống kê" />
                  <ActionBtn icon="edit" label="Sửa" />
                  <ActionBtn
                    icon={t.status === 'active' ? 'pause' : 'play_arrow'}
                    label={t.status === 'active' ? 'Tạm dừng' : 'Mở lại'}
                  />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function ActionBtn({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary flex items-center justify-center transition"
    >
      <Icon name={icon} size={18} />
    </button>
  )
}
