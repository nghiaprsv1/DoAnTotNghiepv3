import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Button } from '@components/ui/Button'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useAdminTrips } from '@hooks/useAdmin'
import { tripDetailPath } from '@constants/routes'
import { AdminDetailDialog, AdminSection, AdminRow } from './components/AdminDetailDialog'
import { cn } from '@utils/cn'

const STATUSES: { key: string; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'published', label: 'Đang mở' },
  { key: 'draft', label: 'Bản nháp' },
  { key: 'completed', label: 'Đã kết thúc' },
  { key: 'cancelled', label: 'Đã huỷ' },
]

const STATUS_BADGE: Record<string, string> = {
  published: 'bg-primary/10 text-primary border-primary/30',
  draft: 'bg-surface-container text-on-surface-variant border-outline-variant/30',
  completed: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  cancelled: 'bg-error/10 text-error border-error/30',
}

const formatDate = (s: string) => new Date(s).toLocaleDateString('vi-VN')
const formatVnd = (n: number) => `₫${n.toLocaleString('vi-VN')}`

/**
 * Read-only admin view of all trips on the platform. Lets admin audit who
 * created which trips, current status and member counts. No edit/delete here
 * by design — trip lifecycle stays with the creator and guides.
 */
export function AdminTripsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [viewId, setViewId] = useState<string | null>(null)
  const pageSize = 20

  const { data, isLoading } = useAdminTrips({
    page,
    pageSize,
    search: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
  })

  const trips = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const detail = trips.find((t) => t.id === viewId) ?? null

  return (
    <div className="space-y-5">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface">Chuyến đi</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Xem toàn bộ chuyến đi do người dùng tạo. Chỉ đọc, không can thiệp lịch trình.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-lowest rounded-full px-4 py-2 shadow-editorial w-full md:w-80">
          <Icon name="search" className="text-on-surface-variant" size={18} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Tìm theo tên chuyến, điểm đến, người tạo…"
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-on-surface-variant/60"
          />
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              setStatus(s.key)
              setPage(1)
            }}
            className={cn(
              'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition border',
              status === s.key
                ? 'bg-primary text-on-primary border-primary shadow-editorial'
                : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:border-primary/40',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState count={5} />
      ) : trips.length === 0 ? (
        <EmptyState icon="travel_explore" title="Không có chuyến đi khớp bộ lọc" />
      ) : (
        <div className="space-y-3">
          {trips.map((t) => (
            <article
              key={t.id}
              className="bg-surface-container-lowest rounded-3xl shadow-editorial p-4 flex flex-col md:flex-row gap-4"
            >
              <img
                src={t.coverImage}
                alt={t.title}
                className="w-full md:w-48 h-32 object-cover rounded-2xl"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-headline font-extrabold text-on-surface line-clamp-1">
                      {t.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                      <Icon name="place" size={12} className="inline mr-1" />
                      {t.destination}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap',
                      STATUS_BADGE[t.status] ?? STATUS_BADGE.draft,
                    )}
                  >
                    {t.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-on-surface-variant">
                  {t.creator && (
                    <div className="flex items-center gap-2">
                      <Avatar src={t.creator.avatar ?? ''} alt={t.creator.name} size="xs" />
                      <span className="font-bold text-on-surface">{t.creator.name}</span>
                    </div>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Icon name="event" size={12} />
                    {formatDate(t.startDate)} → {formatDate(t.endDate)} ({t.durationDays} ngày)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="group" size={12} />
                    {t.memberCount}/{t.maxMembers}
                  </span>
                  {t.priceFrom > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="payments" size={12} />
                      Từ {formatVnd(t.priceFrom)}
                    </span>
                  )}
                  {t.guide && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="verified" size={12} />
                      HDV: {t.guide.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex md:flex-col items-start md:items-end gap-2 md:justify-center">
                <Button size="sm" variant="outline" rounded="full" onClick={() => setViewId(t.id)}>
                  <Icon name="visibility" size={14} />
                  Chi tiết
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button
            size="sm"
            variant="outline"
            rounded="full"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <Icon name="chevron_left" size={16} />
            Trước
          </Button>
          <span className="text-on-surface-variant">
            Trang {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            rounded="full"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
            <Icon name="chevron_right" size={16} />
          </Button>
        </div>
      )}

      {detail && (
        <AdminDetailDialog
          title={detail.title}
          subtitle={`${detail.destination} · ${detail.durationDays} ngày`}
          media={
            <img
              src={detail.coverImage}
              alt={detail.title}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            />
          }
          onClose={() => setViewId(null)}
          footer={
            <Link
              to={tripDetailPath(detail.id)}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full editorial-gradient text-on-primary text-sm font-bold"
            >
              <Icon name="open_in_new" size={16} />
              Mở trang chuyến đi
            </Link>
          }
        >
          {detail.coverImage && (
            <img
              src={detail.coverImage}
              alt={detail.title}
              className="w-full max-h-72 object-cover rounded-2xl"
              loading="lazy"
            />
          )}
          <AdminSection title="Thông tin chuyến đi">
            <AdminRow label="Điểm đến" value={detail.destination} />
            <AdminRow label="Trạng thái" value={detail.status} />
            <AdminRow
              label="Thời gian"
              value={`${formatDate(detail.startDate)} → ${formatDate(detail.endDate)} (${detail.durationDays} ngày)`}
            />
            <AdminRow label="Thành viên" value={`${detail.memberCount}/${detail.maxMembers}`} />
            <AdminRow
              label="Giá từ"
              value={detail.priceFrom > 0 ? formatVnd(detail.priceFrom) : 'Miễn phí'}
            />
            <AdminRow label="Ngày tạo" value={formatDate(detail.createdAt)} />
          </AdminSection>
          <AdminSection title="Người liên quan">
            <AdminRow label="Người tạo" value={detail.creator?.name ?? '—'} />
            <AdminRow label="Hướng dẫn viên" value={detail.guide?.name ?? 'Chưa có'} />
          </AdminSection>
        </AdminDetailDialog>
      )}
    </div>
  )
}
