import { useMemo, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { FilterBar } from '@components/features'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { usePlaces, usePlaceCategories, usePlaceProvinces } from '@hooks/usePlaces'
import { PlaceCard } from './components/PlaceCard'

type SortKey = 'recommended' | 'rating' | 'reviews' | 'name'

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Đề xuất' },
  { key: 'rating', label: 'Đánh giá cao' },
  { key: 'reviews', label: 'Nhiều lượt review' },
  { key: 'name', label: 'A → Z' },
]

const PAGE_SIZE = 6

const ALL_FILTER_ITEM = { key: 'all', label: 'Tất cả', icon: 'apps' }

export function PlacesPage() {
  const [category, setCategory] = useState<string>('all')
  const [province, setProvince] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('recommended')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  // Send filters to BE so the database does the heavy lifting.
  const { data: places, isLoading } = usePlaces({
    category: category === 'all' ? undefined : category,
    province: province === 'all' ? undefined : province,
    keyword: query.trim() || undefined,
  })
  const { data: categoriesData } = usePlaceCategories()
  const { data: provincesData } = usePlaceProvinces()

  const categoryFilters = useMemo(() => {
    const items = (categoriesData ?? []).map((c) => ({
      key: c.key,
      label: c.label,
      icon: c.icon ?? 'place',
    }))
    return [ALL_FILTER_ITEM, ...items]
  }, [categoriesData])

  const provinceFilters = useMemo(
    () => [
      { key: 'all', label: 'Toàn quốc' },
      ...(provincesData ?? []).map((p) => ({ key: p.slug, label: p.name })),
    ],
    [provincesData]
  )

  const sourcePlaces = places ?? []

  const sorted = useMemo(() => {
    const list = sourcePlaces.slice()
    switch (sort) {
      case 'rating':
        list.sort((a, b) => b.rating - a.rating)
        break
      case 'reviews':
        list.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
        break
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
        break
      case 'recommended':
      default:
        list.sort(
          (a, b) =>
            b.rating * Math.log10((b.reviewCount ?? 0) + 10) -
            a.rating * Math.log10((a.reviewCount ?? 0) + 10)
        )
    }
    return list
  }, [sourcePlaces, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
        <FilterBar items={categoryFilters} activeKey={category} onChange={handleCategory} />
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
            {provinceFilters.map((p) => (
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
        <strong className="text-on-surface">{sorted.length}</strong> địa điểm phù hợp
      </p>

      {/* Grid */}
      {isLoading ? (
        <LoadingState count={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="explore_off"
          title="Không có địa điểm phù hợp"
          description="Thử bỏ bớt bộ lọc hoặc đổi từ khoá tìm kiếm."
        />
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
