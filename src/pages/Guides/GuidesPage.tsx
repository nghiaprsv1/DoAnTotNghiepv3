import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { FilterBar } from '@components/features'
import {
  CATEGORY_FILTERS,
  REGION_FILTERS,
  mockHireableGuides,
} from '@constants/mockGuides'
import { ROUTES } from '@constants/routes'
import { GuideListingCard } from './components/GuideListingCard'

type SortKey = 'recommended' | 'price-asc' | 'price-desc' | 'rating' | 'reviews'

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Đề xuất' },
  { key: 'price-asc', label: 'Giá thấp → cao' },
  { key: 'price-desc', label: 'Giá cao → thấp' },
  { key: 'rating', label: 'Đánh giá cao' },
  { key: 'reviews', label: 'Nhiều đánh giá' },
]

export function GuidesPage() {
  const [region, setRegion] = useState<string>('all')
  const [category, setCategory] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('recommended')
  const [query, setQuery] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [availableOnly, setAvailableOnly] = useState(false)

  const guides = useMemo(() => {
    let list = mockHireableGuides.slice()

    if (region !== 'all') {
      list = list.filter((g) => g.regionKeys?.includes(region as never))
    }
    if (category !== 'all') {
      list = list.filter((g) => g.categoryKeys?.includes(category as never))
    }
    if (verifiedOnly) {
      list = list.filter((g) => g.verified)
    }
    if (availableOnly) {
      list = list.filter((g) => g.availability !== 'fully-booked')
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.region.toLowerCase().includes(q) ||
          (g.specialties ?? []).some((s) => s.toLowerCase().includes(q))
      )
    }

    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.pricePerDay - b.pricePerDay)
        break
      case 'price-desc':
        list.sort((a, b) => b.pricePerDay - a.pricePerDay)
        break
      case 'rating':
        list.sort((a, b) => b.rating - a.rating)
        break
      case 'reviews':
        list.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
        break
      default:
        // recommended: verified first, then rating
        list.sort((a, b) => {
          const v = Number(!!b.verified) - Number(!!a.verified)
          return v !== 0 ? v : b.rating - a.rating
        })
    }
    return list
  }, [region, category, sort, query, verifiedOnly, availableOnly])

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      {/* Hero header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div className="max-w-2xl">
          <span className="text-xs font-bold tracking-[0.1em] text-primary uppercase font-headline mb-3 block">
            Concierge Marketplace
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-on-surface tracking-tight leading-tight">
            Thuê <span className="text-primary italic">hướng dẫn viên</span> địa phương
          </h1>
          <p className="text-on-surface-variant mt-3">
            Người bản địa, hiểu rõ vùng đất hơn bất kỳ bản đồ nào — sẵn sàng cùng bạn bắt đầu.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface-container-lowest rounded-full px-4 py-2.5 shadow-editorial w-full md:w-auto md:min-w-[320px]">
          <Icon name="search" className="text-on-surface-variant" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, vùng, chuyên môn…"
            className="bg-transparent border-none outline-none text-sm flex-1 placeholder:text-on-surface-variant/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Xoá tìm kiếm"
              className="text-on-surface-variant hover:text-primary"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Become a guide banner */}
      <Link
        to={ROUTES.GUIDE_APPLY}
        className="group flex items-center gap-4 mb-8 p-5 rounded-3xl editorial-gradient text-on-primary shadow-editorial-lg hover:shadow-editorial transition-all"
      >
        <span className="w-12 h-12 rounded-2xl bg-on-primary/15 flex items-center justify-center flex-shrink-0">
          <Icon name="workspace_premium" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-headline font-extrabold text-lg leading-tight">
            Bạn là người bản địa? Đăng ký làm Hướng dẫn viên
          </p>
          <p className="text-sm text-on-primary/85 mt-0.5">
            Chia sẻ vùng đất bạn yêu, kiếm thu nhập từ đam mê. Hồ sơ duyệt trong 3–5 ngày.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 px-4 py-2.5 rounded-full bg-on-primary text-primary font-headline font-bold text-sm flex-shrink-0 group-hover:scale-105 transition-transform">
          Bắt đầu
          <Icon name="arrow_forward" size={16} />
        </span>
        <span className="sm:hidden">
          <Icon name="arrow_forward" />
        </span>
      </Link>

      {/* Filters */}
      <section className="space-y-3 mb-10">
        <FilterBar items={[...REGION_FILTERS]} activeKey={region} onChange={setRegion} />
        <FilterBar items={[...CATEGORY_FILTERS]} activeKey={category} onChange={setCategory} />

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <ToggleChip
            active={verifiedOnly}
            onClick={() => setVerifiedOnly((v) => !v)}
            icon="verified"
            label="Đã xác minh"
          />
          <ToggleChip
            active={availableOnly}
            onClick={() => setAvailableOnly((v) => !v)}
            icon="event_available"
            label="Còn lịch"
          />

          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-on-surface-variant">Sắp xếp:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-surface-container-lowest border border-outline-variant/30 rounded-full px-3 py-1.5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/40 outline-none"
            >
              {sortOptions.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Results count */}
      <p className="text-sm text-on-surface-variant mb-4">
        <strong className="text-on-surface">{guides.length}</strong> hướng dẫn viên phù hợp
      </p>

      {/* Grid */}
      {guides.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {guides.map((g) => (
            <GuideListingCard key={g.id} guide={g} />
          ))}
        </div>
      )}
    </div>
  )
}

function ToggleChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: string
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-headline font-bold transition active:scale-95 border ${
        active
          ? 'bg-primary text-on-primary border-primary shadow-editorial'
          : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:border-primary/40 hover:text-primary'
      }`}
    >
      <Icon name={icon} size={16} {...(active ? { filled: true } : {})} />
      {label}
    </button>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 bg-surface-container-low rounded-3xl">
      <div className="w-16 h-16 rounded-2xl editorial-gradient text-on-primary flex items-center justify-center mb-4 shadow-editorial">
        <Icon name="person_search" className="text-2xl" />
      </div>
      <h3 className="font-headline text-xl font-extrabold text-on-surface mb-1">
        Không tìm thấy hướng dẫn viên phù hợp
      </h3>
      <p className="text-on-surface-variant max-w-md">
        Thử bỏ bớt bộ lọc hoặc tìm theo từ khoá khác.
      </p>
    </div>
  )
}
