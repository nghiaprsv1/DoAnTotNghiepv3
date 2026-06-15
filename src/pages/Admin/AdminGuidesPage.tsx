import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Button } from '@components/ui/Button'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useApproveGuide, usePendingGuides, useRejectGuide } from '@hooks/useAdmin'
import type { PendingGuide } from '@services/adminService'

const formatVnd = (n: number) => `₫${Number(n).toLocaleString('vi-VN')}`
const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('vi-VN') : '—'

export function AdminGuidesPage() {
  const { data: guides = [], isLoading } = usePendingGuides()
  const approve = useApproveGuide()
  const reject = useRejectGuide()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const detail = guides.find((g) => g.id === openId) ?? null

  const handleApprove = async (id: string) => {
    if (!confirm('Duyệt hồ sơ HDV này?')) return
    setBusyId(id)
    try {
      await approve.mutateAsync(id)
      setOpenId(null)
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Lý do từ chối (sẽ gửi cho HDV):', '') ?? ''
    if (!reason.trim()) return
    setBusyId(id)
    try {
      await reject.mutateAsync({ id, reason: reason.trim() })
      setOpenId(null)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-headline font-extrabold text-3xl text-on-surface">Duyệt HDV</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          {guides.length} hồ sơ đang chờ xét duyệt. Nhấn <b>Xem chi tiết</b> để xem ảnh CCCD,
          chuyên môn, ngôn ngữ và bio trước khi quyết định.
        </p>
      </header>

      {isLoading ? (
        <LoadingState count={3} />
      ) : guides.length === 0 ? (
        <EmptyState
          icon="inventory_2"
          title="Không có hồ sơ chờ duyệt"
          description="Khi traveler đăng ký làm HDV, hồ sơ sẽ xuất hiện tại đây."
        />
      ) : (
        <div className="space-y-3">
          {guides.map((g) => (
            <article
              key={g.id}
              className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5 flex flex-col md:flex-row md:items-center gap-4"
            >
              <div className="flex items-center gap-3 md:flex-1 min-w-0">
                <Avatar src={g.user?.avatar} alt={g.user?.name ?? ''} size="md" />
                <div className="min-w-0">
                  <p className="font-headline font-extrabold text-on-surface truncate">
                    {g.user?.name ?? 'Không rõ'}
                  </p>
                  <p className="text-sm text-on-surface-variant truncate">{g.user?.email}</p>
                  <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                    Nộp ngày {formatDate(g.createdAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 md:flex md:items-center gap-3 md:gap-6 text-sm">
                <Field icon="map" value={g.region ?? '—'} label="Vùng" />
                <Field
                  icon="schedule"
                  value={g.yearsExperience != null ? `${g.yearsExperience} năm` : '—'}
                  label="Kinh nghiệm"
                />
                <Field
                  icon="payments"
                  value={g.pricePerDay ? formatVnd(g.pricePerDay) : '—'}
                  label="Giá / ngày"
                />
              </div>

              <div className="flex items-center gap-2 md:ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  rounded="full"
                  onClick={() => setOpenId(g.id)}
                >
                  <Icon name="visibility" size={16} />
                  Xem chi tiết
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {detail && (
        <DetailDialog
          guide={detail}
          busy={busyId === detail.id}
          onClose={() => setOpenId(null)}
          onApprove={() => handleApprove(detail.id)}
          onReject={() => handleReject(detail.id)}
        />
      )}
    </div>
  )
}

function Field({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
        <Icon name={icon} size={12} />
        {label}
      </p>
      <p className="text-sm font-headline font-bold text-on-surface">{value}</p>
    </div>
  )
}


function DetailDialog({
  guide,
  busy,
  onClose,
  onApprove,
  onReject,
}: {
  guide: PendingGuide
  busy: boolean
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur p-4">
      <div className="bg-surface-container-lowest rounded-3xl shadow-editorial-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <header className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur px-6 py-4 border-b border-outline-variant/15 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar src={guide.user?.avatar} alt={guide.user?.name ?? ''} size="md" ring />
            <div>
              <h3 className="font-headline font-extrabold text-xl text-on-surface">
                {guide.user?.name ?? 'Không rõ'}
              </h3>
              <p className="text-xs text-on-surface-variant">{guide.user?.email}</p>
              <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
                Hồ sơ nộp ngày {formatDate(guide.createdAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center"
            aria-label="Đóng"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="p-6 space-y-5">
          <Section title="Khu vực hoạt động & chuyên môn">
            <Row label="Vùng" value={guide.region ?? '—'} />
            <Row label="Khoá vùng" value={guide.regionKeys?.join(', ') || '—'} />
            <Row label="Lĩnh vực" value={guide.categoryKeys?.join(', ') || '—'} />
            <Row label="Chuyên môn" value={guide.specialties?.join(', ') || '—'} />
            <Row label="Ngôn ngữ" value={guide.languages?.join(', ') || '—'} />
          </Section>

          <Section title="Kinh nghiệm & giá">
            <Row
              label="Kinh nghiệm"
              value={guide.yearsExperience != null ? `${guide.yearsExperience} năm` : '—'}
            />
            <Row
              label="Giá / ngày"
              value={
                guide.pricePerDay
                  ? `${guide.currency ?? '₫'}${Number(guide.pricePerDay).toLocaleString('vi-VN')}`
                  : '—'
              }
            />
            <Row label="Phản hồi" value={guide.responseTime ?? '—'} />
          </Section>

          {guide.bio && (
            <Section title="Giới thiệu">
              <p className="text-sm text-on-surface italic leading-relaxed">"{guide.bio}"</p>
            </Section>
          )}

          <Section title="Giấy tờ tuỳ thân">
            <Row label="Số CCCD/Hộ chiếu" value={guide.idCardNumber ?? '—'} />
            {guide.idCardImage ? (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
                  Ảnh giấy tờ
                </p>
                <a href={guide.idCardImage} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={guide.idCardImage}
                    alt="ID card"
                    className="w-full max-w-md rounded-2xl border border-outline-variant/30"
                    loading="lazy"
                  />
                </a>
              </div>
            ) : (
              <p className="text-sm text-error">⚠ Chưa upload ảnh giấy tờ tuỳ thân</p>
            )}
          </Section>

          {(guide.coverImage || (guide.gallery && guide.gallery.length > 0)) && (
            <Section title="Ảnh đại diện & gallery">
              {guide.coverImage && (
                <img
                  src={guide.coverImage}
                  alt="cover"
                  className="w-full max-w-md rounded-2xl"
                  loading="lazy"
                />
              )}
              {guide.gallery && guide.gallery.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {guide.gallery.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`gallery ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-xl"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </Section>
          )}
        </div>

        <footer className="sticky bottom-0 bg-surface-container-lowest/95 backdrop-blur px-6 py-4 border-t border-outline-variant/15 flex items-center justify-end gap-2">
          <Button size="md" variant="ghost" rounded="full" onClick={onReject} disabled={busy}>
            <Icon name="close" size={16} />
            Từ chối
          </Button>
          <Button size="md" rounded="full" onClick={onApprove} disabled={busy}>
            <Icon name="check" size={16} />
            Duyệt hồ sơ
          </Button>
        </footer>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
      <span className="sm:w-40 text-on-surface-variant">{label}</span>
      <span className="text-on-surface font-semibold flex-1 break-words">{value}</span>
    </div>
  )
}
