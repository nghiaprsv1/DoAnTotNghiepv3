import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import {
  BasicInfoSection,
  ContactSection,
  PreferencesSection,
  TravelProfileSection,
} from './components/sections'
import {
  DangerSection,
  EmergencyContactSection,
  PrivacySection,
  SocialLinksSection,
  TravelDocsSection,
} from './components/extraSections'
import { SecuritySection } from './components/SecuritySection'

const COVER =
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80'
const AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80'

const navAnchors = [
  { id: 'basic', label: 'Cơ bản', icon: 'person' },
  { id: 'contact', label: 'Liên hệ', icon: 'contact_mail' },
  { id: 'travel', label: 'Hồ sơ du lịch', icon: 'explore' },
  { id: 'prefs', label: 'Sở thích', icon: 'favorite' },
  { id: 'docs', label: 'Giấy tờ', icon: 'badge' },
  { id: 'emergency', label: 'Khẩn cấp', icon: 'emergency' },
  { id: 'social', label: 'Mạng xã hội', icon: 'link' },
  { id: 'privacy', label: 'Riêng tư', icon: 'lock' },
  { id: 'security', label: 'Bảo mật', icon: 'shield' },
]

export function EditProfilePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <header className="mb-10">
        <span className="text-xs font-bold tracking-[0.1em] text-primary uppercase font-headline mb-2 block">
          Hồ sơ của bạn
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline text-on-surface">
          Chỉnh sửa hồ sơ
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl">
          Hồ sơ đầy đủ giúp bạn được mời tham gia những chuyến đi phù hợp hơn — và để bạn đồng hành
          tin tưởng hơn.
        </p>
      </header>

      <form className="grid grid-cols-1 lg:grid-cols-12 gap-8" onSubmit={(e) => e.preventDefault()}>
        {/* Left nav (sticky) */}
        <aside className="hidden lg:block lg:col-span-3">
          <nav className="sticky top-24 bg-surface-container-lowest rounded-3xl shadow-editorial p-3 space-y-1">
            {navAnchors.map((a) => (
              <a
                key={a.id}
                href={`#${a.id}`}
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm text-on-surface hover:bg-surface-container-low transition"
              >
                <Icon name={a.icon} size={18} className="text-on-surface-variant" />
                <span className="font-headline font-bold">{a.label}</span>
              </a>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <div className="lg:col-span-9 space-y-8">
          {/* Media banner */}
          <section className="relative">
            <div className="relative h-48 md:h-64 w-full rounded-3xl overflow-hidden bg-surface-container-low">
              <img src={COVER} alt="Cover" className="w-full h-full object-cover" />
              <button
                type="button"
                className="absolute inset-0 bg-black/20 hover:bg-black/40 flex items-center justify-center transition group"
              >
                <span className="flex items-center gap-2 bg-white/20 editorial-blur px-4 py-2 rounded-full text-white border border-white/30 text-sm font-semibold">
                  <Icon name="photo_camera" />
                  Thay đổi ảnh bìa
                </span>
              </button>
            </div>
            <div className="absolute -bottom-12 left-6 md:left-10">
              <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-3xl overflow-hidden border-4 border-surface shadow-editorial-lg bg-surface-container-lowest">
                <img src={AVATAR} alt="Avatar" className="w-full h-full object-cover" />
                <button
                  type="button"
                  className="absolute inset-0 bg-black/30 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
                  aria-label="Đổi ảnh đại diện"
                >
                  <Icon name="add_a_photo" className="text-3xl" />
                </button>
              </div>
            </div>
          </section>

          <div className="mt-20 space-y-8">
            <div id="basic">
              <BasicInfoSection />
            </div>
            <div id="contact">
              <ContactSection />
            </div>
            <div id="travel">
              <TravelProfileSection />
            </div>
            <div id="prefs">
              <PreferencesSection />
            </div>
            <div id="docs">
              <TravelDocsSection />
            </div>
            <div id="emergency">
              <EmergencyContactSection />
            </div>
            <div id="social">
              <SocialLinksSection />
            </div>
            <div id="privacy">
              <PrivacySection />
            </div>
            <div id="security">
              <SecuritySection />
            </div>
            <DangerSection />
          </div>

          {/* Sticky save bar */}
          <div className="sticky bottom-4 z-30 mt-8">
            <div className="flex items-center justify-between gap-3 bg-surface-container-lowest p-3 rounded-full shadow-editorial-lg border border-outline-variant/15">
              <p className="text-xs sm:text-sm text-on-surface-variant pl-3 flex items-center gap-2">
                <Icon name="info" size={16} className="text-primary" />
                <span className="hidden sm:inline">Mọi thay đổi sẽ được lưu khi bạn bấm Lưu.</span>
                <span className="sm:hidden">Lưu thay đổi của bạn</span>
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="md" rounded="full">
                  Huỷ
                </Button>
                <Button type="submit" size="md" rounded="full">
                  <Icon name="check" />
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
