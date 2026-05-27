import { Icon } from '@components/ui/Icon'
import type { HireableGuide } from '@types/trip'

interface Props {
  guide: HireableGuide
}

export function AboutTab({ guide }: Props) {
  return (
    <div className="space-y-8">
      {/* Bio */}
      {guide.bio && (
        <section className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-editorial">
          <h3 className="font-headline font-extrabold text-xl text-on-surface mb-3">
            Về {guide.name}
          </h3>
          <p className="text-on-surface/85 leading-relaxed italic">"{guide.bio}"</p>
        </section>
      )}

      {/* Specialties */}
      {guide.specialties && guide.specialties.length > 0 && (
        <section className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-editorial">
          <h3 className="font-headline font-extrabold text-xl text-on-surface mb-4 flex items-center gap-2">
            <Icon name="tour" className="text-primary" />
            Chuyên môn
          </h3>
          <div className="flex flex-wrap gap-2">
            {guide.specialties.map((s) => (
              <span
                key={s}
                className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Languages */}
      {guide.languages && guide.languages.length > 0 && (
        <section className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-editorial">
          <h3 className="font-headline font-extrabold text-xl text-on-surface mb-4 flex items-center gap-2">
            <Icon name="translate" className="text-primary" />
            Ngôn ngữ giao tiếp
          </h3>
          <div className="flex flex-wrap gap-2">
            {guide.languages.map((l) => (
              <span
                key={l}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface text-sm font-semibold"
              >
                <Icon name="check" size={14} className="text-primary" />
                {l}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Highlights */}
      {guide.highlights && guide.highlights.length > 0 && (
        <section className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-editorial">
          <h3 className="font-headline font-extrabold text-xl text-on-surface mb-4 flex items-center gap-2">
            <Icon name="workspace_premium" className="text-primary" />
            Điểm nổi bật
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {guide.highlights.map((h) => (
              <li
                key={h}
                className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low"
              >
                <span className="w-9 h-9 rounded-xl editorial-gradient text-on-primary flex items-center justify-center flex-shrink-0">
                  <Icon name="star" className="fill" size={18} />
                </span>
                <span className="font-bold text-on-surface">{h}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
