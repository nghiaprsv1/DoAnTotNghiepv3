import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Button } from '@components/ui/Button'
import { ReviewModal } from '@components/features/ReviewModal'
import { mockPlaces } from '@constants/mockPlaces'
import { ROUTES } from '@constants/routes'
import { Rating } from '../GuideDetail/components/Rating'
import { PlaceCard } from './components/PlaceCard'

const TABS = [
  { key: 'overview', label: 'Tổng quan', icon: 'info' },
  { key: 'reviews', label: 'Đánh giá', icon: 'reviews' },
  { key: 'similar', label: 'Tương tự', icon: 'travel_explore' },
] as const
type TabKey = (typeof TABS)[number]['key']

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const place = mockPlaces.find((p) => p.id === id) ?? mockPlaces[0]
  const [tab, setTab] = useState<TabKey>('overview')
  const [galleryIdx, setGalleryIdx] = useState(0)
  const [openReview, setOpenReview] = useState(false)

  const similar = useMemo(
    () =>
      (place.relatedIds ?? [])
        .map((rid) => mockPlaces.find((p) => p.id === rid))
        .filter((p): p is NonNullable<typeof p> => !!p),
    [place]
  )

  const gallery = place.gallery && place.gallery.length > 0 ? place.gallery : [place.coverImage]

  if (!place) {
    return (
      <div className="text-center py-32 text-on-surface-variant">Không tìm thấy địa điểm.</div>
    )
  }

  return (
    <div className="flex-grow">
      {/* Hero */}
      <section className="relative h-[420px] md:h-[520px] w-full overflow-hidden">
        <img src={gallery[galleryIdx]} alt={place.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-on-surface/85 via-on-surface/20 to-transparent" />

        <div className="absolute top-6 left-6">
          <Link
            to={ROUTES.PLACES}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 editorial-blur text-white text-sm font-bold border border-white/30 hover:bg-white/30 transition"
          >
            <Icon name="arrow_back" size={16} />
            Danh sách địa điểm
          </Link>
        </div>

        <div className="absolute top-6 right-6 flex gap-2">
          <button
            type="button"
            aria-label="Lưu địa điểm"
            className="w-10 h-10 rounded-full bg-white/20 editorial-blur text-white border border-white/30 flex items-center justify-center hover:bg-white/30 transition"
          >
            <Icon name="favorite" filled={place.isSaved} />
          </button>
          <button
            type="button"
            aria-label="Chia sẻ"
            className="w-10 h-10 rounded-full bg-white/20 editorial-blur text-white border border-white/30 flex items-center justify-center hover:bg-white/30 transition"
          >
            <Icon name="share" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-white/20 editorial-blur text-white text-[11px] font-bold uppercase tracking-widest border border-white/30">
              {place.province}
            </span>
            {place.tags?.slice(0, 3).map((t) => (
              <span
                key={t}
                className="px-3 py-1 rounded-full bg-white/15 editorial-blur text-white text-[11px] font-bold uppercase tracking-widest border border-white/20"
              >
                {t}
              </span>
            ))}
          </div>
          <h1 className="text-4xl md:text-6xl font-headline font-extrabold tracking-tight text-white drop-shadow leading-tight">
            {place.name}
          </h1>
          <p className="text-white/85 mt-3 max-w-2xl text-lg italic drop-shadow">
            "{place.description}"
          </p>
        </div>

        {/* Gallery thumbnails */}
        {gallery.length > 1 && (
          <div className="absolute bottom-6 right-6 flex gap-2">
            {gallery.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setGalleryIdx(i)}
                aria-label={`Ảnh ${i + 1}`}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition ${
                  i === galleryIdx ? 'border-primary scale-110' : 'border-white/40'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main */}
        <div className="lg:col-span-8 space-y-8">
          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat icon="star" value={place.rating.toFixed(2)} label={`${place.reviewCount} đánh giá`} />
            <Stat icon="schedule" value={place.duration ?? '-'} label="thời gian" />
            <Stat icon="payments" value={place.entranceFee ?? 'Miễn phí'} label="vé vào" />
            <Stat icon="event" value={place.bestTime ?? 'Quanh năm'} label="thời điểm đẹp" />
          </div>

          {/* Tabs */}
          <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-1 flex">
            {TABS.map((t) => {
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-headline font-bold transition ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <Icon name={t.icon} size={18} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              )
            })}
          </div>

          {tab === 'overview' && (
            <div className="space-y-6">
              <section className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-editorial">
                <h2 className="font-headline font-extrabold text-2xl text-on-surface mb-3">
                  Giới thiệu
                </h2>
                <p className="text-on-surface/85 leading-relaxed">
                  {place.longDescription ?? place.description}
                </p>
              </section>

              {place.highlights && place.highlights.length > 0 && (
                <section className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-editorial">
                  <h2 className="font-headline font-extrabold text-2xl text-on-surface mb-4 flex items-center gap-2">
                    <Icon name="auto_awesome" className="text-primary" />
                    Điểm tham quan nổi bật
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {place.highlights.map((h, i) => (
                      <li
                        key={h}
                        className="flex items-center gap-3 p-3 bg-surface-container-low rounded-2xl"
                      >
                        <span className="w-9 h-9 rounded-xl editorial-gradient text-on-primary flex items-center justify-center font-extrabold flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-bold text-on-surface">{h}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <section className="space-y-4">
              <div className="bg-surface-container-low rounded-3xl p-5 md:p-6 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 items-center">
                <div className="text-center md:text-left">
                  <p className="text-5xl font-extrabold font-headline text-on-surface leading-none">
                    {place.rating.toFixed(2)}
                  </p>
                  <Rating rating={place.rating} size={20} className="mt-2" />
                  <p className="text-xs text-on-surface-variant mt-2 font-bold uppercase tracking-widest">
                    {place.reviewCount} đánh giá
                  </p>
                </div>
                <div>
                  <p className="text-sm text-on-surface/80 mb-3">
                    Cộng đồng TravelSocial đánh giá địa điểm này như thế nào?
                  </p>
                  <Button size="md" rounded="full" onClick={() => setOpenReview(true)}>
                    <Icon name="rate_review" />
                    Viết đánh giá
                  </Button>
                </div>
              </div>

              {(place.reviews ?? []).map((r) => (
                <article
                  key={r.id}
                  className="bg-surface-container-lowest rounded-3xl p-5 md:p-6 shadow-editorial space-y-3"
                >
                  <header className="flex items-start gap-3">
                    <Avatar src={r.authorAvatar} alt={r.authorName} size="md" ring />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-headline font-extrabold text-on-surface">
                          {r.authorName}
                        </p>
                        <Rating rating={r.rating} size={14} />
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">{r.date}</p>
                    </div>
                  </header>
                  <p className="text-sm text-on-surface/85 leading-relaxed">{r.content}</p>
                  <footer className="flex items-center gap-4 pt-2 border-t border-outline-variant/15">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary font-bold"
                    >
                      <Icon name="thumb_up" size={16} />
                      Hữu ích
                      {r.helpfulCount && (
                        <span className="text-on-surface-variant/70">({r.helpfulCount})</span>
                      )}
                    </button>
                  </footer>
                </article>
              ))}
            </section>
          )}

          {tab === 'similar' && (
            <section className="space-y-4">
              <h2 className="font-headline font-extrabold text-2xl text-on-surface">
                Địa điểm tương tự
              </h2>
              {similar.length === 0 ? (
                <div className="bg-surface-container-low rounded-3xl p-10 text-center">
                  <Icon name="explore_off" className="text-3xl text-on-surface-variant mb-2" />
                  <p className="text-on-surface-variant">Chưa có gợi ý tương tự.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {similar.map((p) => (
                    <PlaceCard key={p.id} place={p} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="bg-surface-container-lowest rounded-3xl shadow-editorial-lg p-6 border-t-4 border-primary">
            <h3 className="font-headline font-extrabold text-lg text-on-surface mb-4">
              Thông tin địa điểm
            </h3>
            <ul className="space-y-3 text-sm">
              {place.address && (
                <Info icon="location_on" label="Địa chỉ" value={place.address} />
              )}
              {place.city && <Info icon="apartment" label="Khu vực" value={place.city} />}
              <Info icon="public" label="Tỉnh/Thành" value={place.province} />
              {place.duration && (
                <Info icon="schedule" label="Thời gian" value={place.duration} />
              )}
              {place.bestTime && (
                <Info icon="event" label="Thời điểm đẹp" value={place.bestTime} />
              )}
              {place.entranceFee && (
                <Info icon="payments" label="Vé vào" value={place.entranceFee} />
              )}
            </ul>
          </section>

          {place.openingHours && place.openingHours.length > 0 && (
            <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-6">
              <h3 className="font-headline font-extrabold text-lg text-on-surface mb-3 flex items-center gap-2">
                <Icon name="schedule" className="text-primary" />
                Giờ mở cửa
              </h3>
              <ul className="space-y-1.5 text-sm">
                {place.openingHours
                  .slice()
                  .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7))
                  .map((h) => (
                    <li
                      key={h.day}
                      className="flex items-center justify-between py-1 border-b border-outline-variant/10 last:border-0"
                    >
                      <span className="text-on-surface-variant">{DAY_LABELS[h.day]}</span>
                      <span className="font-bold text-on-surface">
                        {h.closed ? 'Đóng cửa' : `${h.open} - ${h.close}`}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          <Button size="lg" rounded="full" className="w-full">
            <Icon name="add_location_alt" />
            Thêm vào chuyến đi
          </Button>
        </aside>
      </div>

      <ReviewModal
        open={openReview}
        onClose={() => setOpenReview(false)}
        target={{
          kind: 'place',
          name: place.name,
          image: place.coverImage,
          context: place.province,
        }}
      />
    </div>
  )
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl py-3 px-3 text-center shadow-editorial">
      <Icon name={icon} className="text-primary" size={18} />
      <p className="font-headline font-extrabold text-on-surface text-sm mt-1 leading-tight truncate">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant truncate">
        {label}
      </p>
    </div>
  )
}

function Info({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          {label}
        </p>
        <p className="text-on-surface font-bold leading-tight">{value}</p>
      </div>
    </li>
  )
}
