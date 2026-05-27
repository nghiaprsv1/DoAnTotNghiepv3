import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { ROUTES } from '@constants/routes'

const COVER =
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80'
const AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80'

const stats = [
  { label: 'Chuyến đi', value: 24 },
  { label: 'Đã tạo', value: 8 },
  { label: 'Người theo dõi', value: '1.2k' },
  { label: 'Đang theo dõi', value: 450 },
]

const gallery = [
  { title: 'Hạ Long: Kỳ quan giữa sương mù', date: '3 ngày • 4 người', large: true },
  { title: 'Hội An Hoài Cổ', date: 'Tháng 12, 2023' },
  { title: 'Đà Lạt Mộng Mơ', date: 'Tháng 1, 2024' },
  { title: 'Đà Nẵng Biển Gọi', date: 'Tháng 2, 2024' },
  { title: 'Miền Tây Sông Nước', date: 'Tháng 3, 2024', large: true },
]

const tabs = ['Chuyến đi của tôi', 'Ảnh/Video', 'Đánh giá']

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState(tabs[0])

  return (
    <div>
      {/* Cover + basic info */}
      <section className="relative">
        <div className="h-64 md:h-80 w-full overflow-hidden">
          <img src={COVER} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto px-6 -mt-16 md:-mt-24 relative z-10 flex flex-col md:flex-row md:items-end gap-6">
          <div className="relative group">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-[6px] border-surface bg-surface overflow-hidden shadow-2xl">
              <img src={AVATAR} alt="Minh Anh" className="w-full h-full object-cover" />
            </div>
            <button
              type="button"
              className="absolute bottom-2 right-2 bg-primary p-2 rounded-full text-on-primary shadow-lg hover:scale-110 transition-transform"
              aria-label="Change avatar"
            >
              <Icon name="photo_camera" size={18} />
            </button>
          </div>

          <div className="flex-1 pb-4">
            <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface font-headline tracking-tight">
              Minh Anh
            </h1>
            <p className="text-on-surface-variant font-medium mt-1">
              Người yêu du lịch, thích khám phá những cung đường mới
            </p>
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-on-surface-variant">
              <span className="flex items-center gap-1">
                <Icon name="location_on" size={18} />
                TP. Hồ Chí Minh
              </span>
              <span className="flex items-center gap-1">
                <Icon name="calendar_today" size={18} />
                Tham gia tháng 10, 2023
              </span>
            </div>
          </div>

          <div className="flex gap-3 pb-4">
            <Link to={ROUTES.PROFILE_EDIT}>
              <Button variant="secondary">
                <Icon name="edit" size={18} />
                Chỉnh sửa
              </Button>
            </Link>
            <button
              type="button"
              className="bg-surface-container-high text-primary p-2.5 rounded-full hover:bg-surface-container-highest transition-all"
              aria-label="Share"
            >
              <Icon name="share" />
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col items-center"
            >
              <span className="text-3xl font-extrabold text-primary font-headline">{s.value}</span>
              <span className="text-xs uppercase tracking-widest text-on-surface-variant mt-2">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs + gallery */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex border-b border-surface-container-high mb-8">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-4 font-headline font-semibold text-sm transition-colors ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary font-bold'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {gallery.map((trip, i) => (
            <div
              key={trip.title}
              className={`group relative overflow-hidden rounded-3xl bg-surface-container-low ${
                trip.large ? 'md:col-span-2 aspect-[16/10]' : 'aspect-square'
              }`}
            >
              <img
                src={COVER}
                alt={trip.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 md:p-8">
                {i === 0 && (
                  <Badge variant="secondary" className="mb-3">
                    Mới nhất
                  </Badge>
                )}
                <h3 className="text-white text-xl md:text-2xl font-bold font-headline mb-1">
                  {trip.title}
                </h3>
                <p className="text-white/70 text-xs">{trip.date}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
