import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { LoadingState } from '@components/common/LoadingState'
import { ROUTES } from '@constants/routes'
import { useAuthStore } from '@store/authStore'
import { useCurrentUserStore } from '@store/currentUserStore'
import { useUserProfile } from '@hooks/useUserProfile'
import { userService } from '@services/userService'
import { uploadService } from '@services/uploadService'
import {
  BasicInfoSection,
  ContactSection,
  PreferencesSection,
  TravelProfileSection,
  type BasicInfoValue,
  type ContactValue,
} from './components/sections'
import {
  DangerSection,
  PrivacySection,
  SocialLinksSection,
  type SocialLinksValue,
} from './components/extraSections'
import { SecuritySection } from './components/SecuritySection'
import type { TravelPreferences } from '@types/profile'

const navAnchors = [
  { id: 'basic', label: 'Cơ bản', icon: 'person' },
  { id: 'contact', label: 'Liên hệ', icon: 'contact_mail' },
  { id: 'travel', label: 'Hồ sơ du lịch', icon: 'explore' },
  { id: 'prefs', label: 'Sở thích', icon: 'favorite' },
  { id: 'social', label: 'Mạng xã hội', icon: 'link' },
  { id: 'privacy', label: 'Riêng tư', icon: 'lock' },
  { id: 'security', label: 'Bảo mật', icon: 'shield' },
]

export function EditProfilePage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentUserId = useCurrentUserStore((s) => s.id)
  const updateCurrent = useCurrentUserStore((s) => s.update)
  const { data: profile, isLoading, refetch } = useUserProfile(currentUserId ?? undefined)

  const [basic, setBasic] = useState<BasicInfoValue>({ name: '', handle: '', bio: '' })
  const [contact, setContact] = useState<ContactValue>({ email: '', phone: '', location: '' })
  const [social, setSocial] = useState<SocialLinksValue>({
    instagram: '',
    facebook: '',
    tiktok: '',
    website: '',
  })
  const [travel, setTravel] = useState<TravelPreferences>({
    travelStyles: [],
    tripPurposes: [],
    budgetLevel: null,
    experienceLevel: null,
    terrainPrefs: [],
    activities: [],
    languages: [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState<'avatar' | 'cover' | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  // Hydrate the form once profile data is available.
  useEffect(() => {
    if (!profile) return
    setBasic({
      name: profile.name ?? '',
      handle: profile.handle ?? '',
      bio: profile.bio ?? '',
    })
    setContact({
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      location: profile.location ?? '',
    })
    setSocial({
      instagram: profile.socialLinks?.instagram ?? '',
      facebook: profile.socialLinks?.facebook ?? '',
      tiktok: profile.socialLinks?.tiktok ?? '',
      website: profile.socialLinks?.website ?? '',
    })
    setTravel({
      travelStyles: profile.preferences?.travelStyles ?? [],
      tripPurposes: profile.preferences?.tripPurposes ?? [],
      budgetLevel: profile.preferences?.budgetLevel ?? null,
      experienceLevel: profile.preferences?.experienceLevel ?? null,
      terrainPrefs: profile.preferences?.terrainPrefs ?? [],
      activities: profile.preferences?.activities ?? [],
      languages: profile.preferences?.languages ?? [],
    })
  }, [profile])

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />

  if (isLoading || !profile) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <LoadingState label="Đang tải hồ sơ..." />
      </div>
    )
  }

  const handleMediaUpload = async (kind: 'avatar' | 'cover', file: File) => {
    setMediaError(null)
    setUploadingMedia(kind)
    try {
      const url = await uploadService.uploadOne(file)
      const updated = await userService.updateMe({ [kind]: url })
      // Reflect in TopNav avatar / current store immediately
      if (kind === 'avatar') updateCurrent({ avatar: updated.avatar })
      await refetch()
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      setMediaError(ax.response?.data?.message ?? 'Tải ảnh lên thất bại.')
    } finally {
      setUploadingMedia(null)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    setSavedOk(false)
    try {
      // Strip empty fields so the BE keeps the existing value untouched.
      const trimmedSocial = Object.fromEntries(
        Object.entries(social)
          .map(([k, v]) => [k, v.trim()])
          .filter(([, v]) => v.length > 0),
      )

      const updated = await userService.updateMe({
        name: basic.name.trim(),
        handle: basic.handle.replace(/^@/, '').trim(),
        bio: basic.bio.trim(),
        phone: contact.phone.trim() || undefined,
        location: contact.location.trim() || undefined,
        socialLinks: trimmedSocial,
        preferences: travel,
      })
      // Reflect changes in the navbar/profile via currentUserStore.
      updateCurrent({
        name: updated.name,
        avatar: updated.avatar,
      })
      await refetch()
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      setError(ax.response?.data?.message ?? 'Không lưu được hồ sơ. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

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

      <form className="grid grid-cols-1 lg:grid-cols-12 gap-8" onSubmit={handleSave}>
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
              {profile.cover && (
                <img src={profile.cover} alt="Cover" className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingMedia === 'cover'}
                className="absolute inset-0 bg-black/20 hover:bg-black/40 flex items-center justify-center transition group disabled:opacity-60"
              >
                <span className="flex items-center gap-2 bg-white/20 editorial-blur px-4 py-2 rounded-full text-white border border-white/30 text-sm font-semibold">
                  <Icon name={uploadingMedia === 'cover' ? 'hourglass_empty' : 'photo_camera'} />
                  {uploadingMedia === 'cover' ? 'Đang tải lên…' : 'Thay đổi ảnh bìa'}
                </span>
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleMediaUpload('cover', f)
                  e.target.value = ''
                }}
              />
            </div>
            <div className="absolute -bottom-12 left-6 md:left-10">
              <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-3xl overflow-hidden border-4 border-surface shadow-editorial-lg bg-surface-container-lowest flex items-center justify-center">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <Icon name="person" className="text-5xl text-on-surface-variant" />
                )}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingMedia === 'avatar'}
                  className="absolute inset-0 bg-black/30 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity disabled:opacity-100"
                  aria-label="Đổi ảnh đại diện"
                >
                  <Icon
                    name={uploadingMedia === 'avatar' ? 'hourglass_empty' : 'add_a_photo'}
                    className="text-3xl"
                  />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleMediaUpload('avatar', f)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>
            {mediaError && (
              <p className="mt-3 text-sm text-error flex items-center gap-1">
                <Icon name="error" size={16} />
                {mediaError}
              </p>
            )}
          </section>

          <div className="mt-20 space-y-8">
            <div id="basic">
              <BasicInfoSection
                value={basic}
                onChange={(patch) => setBasic((b) => ({ ...b, ...patch }))}
              />
            </div>
            <div id="contact">
              <ContactSection
                value={contact}
                onChange={(patch) => setContact((c) => ({ ...c, ...patch }))}
              />
            </div>
            <div id="travel">
              <TravelProfileSection
                value={travel}
                onChange={(patch) => setTravel((t) => ({ ...t, ...patch }))}
              />
            </div>
            <div id="prefs">
              <PreferencesSection
                value={travel}
                onChange={(patch) => setTravel((t) => ({ ...t, ...patch }))}
              />
            </div>
            <div id="social">
              <SocialLinksSection
                value={social}
                onChange={(patch) => setSocial((s) => ({ ...s, ...patch }))}
              />
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
              <p className="text-xs sm:text-sm text-on-surface-variant pl-3 flex items-center gap-2 min-w-0">
                {error ? (
                  <>
                    <Icon name="error" size={16} className="text-error" />
                    <span className="text-error truncate">{error}</span>
                  </>
                ) : savedOk ? (
                  <>
                    <Icon name="check_circle" size={16} className="text-green-600" />
                    <span className="text-green-700">Đã lưu hồ sơ.</span>
                  </>
                ) : (
                  <>
                    <Icon name="info" size={16} className="text-primary" />
                    <span className="hidden sm:inline">Mọi thay đổi sẽ được lưu khi bạn bấm Lưu.</span>
                    <span className="sm:hidden">Lưu thay đổi</span>
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  rounded="full"
                  onClick={() => navigate(ROUTES.PROFILE)}
                >
                  Huỷ
                </Button>
                <Button type="submit" size="md" rounded="full" isLoading={saving}>
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
