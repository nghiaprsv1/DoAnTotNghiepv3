import { useEffect, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { ChipSelect } from '../EditProfile/components/ChipSelect'
import { REGIONS, SPECIALTIES, LANGUAGES, TOUR_TYPES } from '../GuideApply/components/options'
import { useMyGuideProfile, useUpdateMyGuideProfile } from '@hooks/useGuides'

/**
 * Real editor for the signed-in guide's PROFESSIONAL profile (bio, specialties,
 * languages, region, price). This edits `guide_profiles` — distinct from the
 * personal user profile at /profile/edit.
 */
export function GuideProfileTab() {
  const { data: profile, isLoading } = useMyGuideProfile()
  const update = useUpdateMyGuideProfile()

  const [bio, setBio] = useState('')
  const [region, setRegion] = useState<string[]>([])
  const [categoryKeys, setCategoryKeys] = useState<string[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [pricePerDay, setPricePerDay] = useState<number>(0)
  const [saved, setSaved] = useState(false)

  // Hydrate form once the profile loads.
  useEffect(() => {
    if (!profile) return
    setBio(profile.bio ?? '')
    setRegion(profile.regionKeys ?? [])
    setCategoryKeys(profile.categoryKeys ?? [])
    setSpecialties(profile.specialties ?? [])
    setLanguages(profile.languages ?? [])
    setPricePerDay(profile.pricePerDay ?? 0)
  }, [profile])

  if (isLoading) {
    return (
      <div className="bg-surface-container-low rounded-3xl p-10 text-center text-on-surface-variant">
        Đang tải hồ sơ…
      </div>
    )
  }

  const onSave = () => {
    update.mutate(
      {
        bio,
        regionKeys: region,
        region: REGIONS.find((r) => r.value === region[0])?.label ?? profile?.region ?? '',
        categoryKeys,
        specialties,
        languages,
        pricePerDay,
      },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2500)
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-6 md:p-8 space-y-8">
        <header>
          <h2 className="font-headline font-extrabold text-2xl text-on-surface">Hồ sơ Hướng dẫn viên</h2>
          <p className="text-on-surface-variant mt-1">
            Thông tin này hiển thị công khai trên trang HDV của bạn.
          </p>
        </header>

        {/* Bio */}
        <section>
          <label className="font-headline font-bold text-on-surface flex items-center gap-2 mb-3">
            <Icon name="badge" className="text-primary" size={20} /> Giới thiệu bản thân
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Vài dòng giới thiệu về bạn, kinh nghiệm và phong cách dẫn tour…"
            className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 text-on-surface focus:border-primary outline-none resize-none"
          />
        </section>

        {/* Region */}
        <section>
          <label className="font-headline font-bold text-on-surface flex items-center gap-2 mb-3">
            <Icon name="map" className="text-primary" size={20} /> Vùng phụ trách
          </label>
          <ChipSelect options={REGIONS} value={region} onChange={setRegion} single />
        </section>

        {/* Tour types */}
        <section>
          <label className="font-headline font-bold text-on-surface flex items-center gap-2 mb-3">
            <Icon name="tour" className="text-primary" size={20} /> Loại hình tour
          </label>
          <ChipSelect options={TOUR_TYPES} value={categoryKeys} onChange={setCategoryKeys} />
        </section>

        {/* Specialties */}
        <section>
          <label className="font-headline font-bold text-on-surface flex items-center gap-2 mb-3">
            <Icon name="interests" className="text-primary" size={20} /> Chuyên môn
          </label>
          <ChipSelect options={SPECIALTIES} value={specialties} onChange={setSpecialties} />
        </section>

        {/* Languages */}
        <section>
          <label className="font-headline font-bold text-on-surface flex items-center gap-2 mb-3">
            <Icon name="translate" className="text-primary" size={20} /> Ngôn ngữ giao tiếp
          </label>
          <ChipSelect options={LANGUAGES} value={languages} onChange={setLanguages} />
        </section>

        {/* Price */}
        <section>
          <label className="font-headline font-bold text-on-surface flex items-center gap-2 mb-3">
            <Icon name="payments" className="text-primary" size={20} /> Giá / ngày (VND)
          </label>
          <input
            type="number"
            min={0}
            step={50000}
            value={pricePerDay}
            onChange={(e) => setPricePerDay(Number(e.target.value))}
            className="w-full max-w-xs rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-3 text-on-surface focus:border-primary outline-none"
          />
        </section>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onSave}
            disabled={update.isPending}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full editorial-gradient text-on-primary font-headline font-bold shadow-editorial active:scale-95 transition disabled:opacity-60"
          >
            <Icon name={update.isPending ? 'progress_activity' : 'save'} size={18} />
            {update.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-primary font-bold">
              <Icon name="check_circle" size={18} /> Đã lưu
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
