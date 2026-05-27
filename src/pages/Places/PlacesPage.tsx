import { useMemo, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { FilterBar } from '@components/features'
import { PLACE_CATEGORIES, PROVINCES, mockPlaces } from '@constants/mockPlaces'
import { PlaceCard } from './components/PlaceCard'

type SortKey = 'recommended' | 'rating' | 'reviews' | 'name'

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Đề xuất' },
  { key: 'rating', label: 'Đánh giá cao' },
  { key: 'reviews', label: 'Nhiều lượt review' },
  { key: 'name', label: 'A → Z' },
]

const PAGE_SIZE = 6

export function PlacesPage() {
  const [category, setCategory] = useState<string>('all')
  const [province, setProvince] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('recommended')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let list = mockPlaces.slice()

    if (category !== 'all') list = list.filter((p) => p.category === category)
    if (province !== 'all') list = list.filter((p) => p.province === province)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.province.toLowerCase().includes(q) ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
          (p.highlights ?? []).some((h) => h.toLowerCase().includes(q))
      )
    }

    switch (sort) {
      case 'rating':
        list.sort((a, b) => b.rating - a.rating)
        break
      case 'reviews':
        list.sort((a, b) => b.reviewCount - a.reviewCount)
        break
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
        break
      default:
        // recommended: rating * log(reviews)
        list.sort(
          (a, b) =>
            b.rating * Math.log10(b.reviewCount + 10) -
            a.rating * Math.log10(a.reviewCount + 10)
        )
    }
    return list
  }, [category, province, sort, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset page when filters change
  const handleCategory = (k: string) => {
    setCategory(k)
    setPage(1)
  }
  const handleProvince = (k: string) => {
    setProvince(k)
    setPage(1)
  }
  const handleQuery = (v: string) => {
    setQuery(v)
    setPage(1)
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      {/* Hero */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div className="max-w-2xl">
          <span className="text-xs font-bold tracking-[0.1em] text-primary uppercase font-headline mb-3 block">
            Travel Places
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-on-surface tracking-tight leading-tight">
            Khám phá <span className="text-primary italic">địa điểm</span> du lịch Việt Nam
          </h1>
          <p className="text-on-surface-variant mt-3">
            Từ kỳ quan UNESCO đến những góc nhỏ chưa ai biết — tìm điểm đến tiếp theo của bạn.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface-container-lowest rounded-full px-4 py-2.5 shadow-editorial w-full md:w-auto md:min-w-[320px]">
          <Icon name="search" className="text-on-surface-variant" />
          <input
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Tìm theo tên, tỉnh, hashtag…"
            className="bg-transparent border-none outline-none text-sm flex-1 placeholder:text-on-surface-variant/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => handleQuery('')}
              aria-label="Xoá tìm kiếm"
              className="text-on-surface-variant hover:text-primary"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Category filter */}
      <section className="mb-3">
        <FilterBar items={[...PLACE_CATEGORIES]} activeKey={category} onChange={handleCategory} />
      </section>

      {/* Province + sort row */}
      <section className="flex flex-wrap items-center gap-3 mb-8">
        <div className="flex items-center gap-2 text-sm">
          <Icon name="public" size={18} className="text-on-surface-variant" />
          <span className="text-on-surface-variant">Tỉnh/thành:</span>
          <select
            value={province}
            onChange={(e) => handleProvince(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/30 rounded-full px-3 py-1.5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/40 outline-none"
          >
            {PROVINCES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

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
      </section>

      {/* Result count */}
      <p className="text-sm text-on-surface-variant mb-4">
        <strong className="text-on-surface">{filtered.length}</strong> địa điểm phù hợp
      </p>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="bg-surface-container-low rounded-3xl p-12 text-center">
          <Icon name="explore_off" className="text-3xl text-on-surface-variant mb-2" />
          <p className="text-on-surface-variant">
            Không tìm thấy địa điểm phù hợp. Thử bỏ bớt bộ lọc.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visible.map((p) => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Phân trang"
          className="flex items-center justify-center gap-2 mt-10"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-10 h-10 rounded-full bg-surface-container-lowest hover:bg-surface-container-low text-on-surface disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition"
          >
            <Icon name="chevron_left" />
          </button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1
            const active = n === page
            return (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`w-10 h-10 rounded-full font-headline font-bold text-sm transition ${
                  active
                    ? 'editorial-gradient text-on-primary shadow-editorial'
                    : 'bg-surface-container-lowest hover:bg-surface-container-low text-on-surface'
                }`}
              >
                {n}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-10 h-10 rounded-full bg-surface-container-lowest hover:bg-surface-container-low text-on-surface disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition"
          >
            <Icon name="chevron_right" />
          </button>
        </nav>
      )}
    </div>
  )
}
