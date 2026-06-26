import { Icon } from '@components/ui/Icon'

const tags = [
  { tag: '#hagiang', count: '12.4k bài viết', trend: 'Hot' },
  { tag: '#sapatrekking', count: '8.1k bài viết' },
  { tag: '#hoiannight', count: '5.7k bài viết' },
  { tag: '#phuquochiddenbeach', count: '3.2k bài viết', trend: 'Mới' },
  { tag: '#streetfoodvn', count: '21.9k bài viết' },
]

export function TrendingTags() {
  return (
    <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5">
      <header className="flex items-center justify-between mb-4">
        <h3 className="font-headline font-extrabold text-on-surface flex items-center gap-2">
          <Icon name="trending_up" className="text-primary" size={20} />
          Đang thịnh hành
        </h3>
      </header>

      <ul className="space-y-3">
        {tags.map((t) => (
          <li key={t.tag}>
            <button
              type="button"
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-surface-container-low transition text-left"
            >
              <div className="min-w-0">
                <p className="font-headline font-bold text-sm text-on-surface truncate">
                  {t.tag}
                </p>
                <p className="text-[11px] text-on-surface-variant">{t.count}</p>
              </div>
              {t.trend && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                  {t.trend}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <footer className="mt-4 pt-4 border-t border-outline-variant/15 text-[11px] text-on-surface-variant/70 leading-relaxed">
        © 2024 TravelSocial · Về chúng tôi · Quyền riêng tư · Trợ giúp
      </footer>
    </section>
  )
}
