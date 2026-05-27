import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'

const HERO =
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80'

interface SectionHeaderProps {
  icon: string
  title: string
}

function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="w-10 h-10 rounded-full editorial-gradient flex items-center justify-center text-on-primary">
        <Icon name={icon} />
      </div>
      <h2 className="font-headline text-2xl font-bold">{title}</h2>
    </div>
  )
}

export function CreateTripPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Hero */}
      <div className="mb-12 relative overflow-hidden rounded-2xl h-64 flex items-end p-8">
        <div className="absolute inset-0 z-0">
          <img src={HERO} alt="Sapa" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <div className="relative z-10 text-on-primary">
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
            Design Your Journey
          </h1>
          <p className="text-on-primary/90 max-w-xl">
            Curate a unique Vietnamese experience. Fill in the details below to share your vision
            with the community.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Form column */}
        <form className="lg:col-span-8 space-y-12" onSubmit={(e) => e.preventDefault()}>
          {/* Section 1: Basics */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <SectionHeader icon="edit_note" title="The Basics" />
            <div className="space-y-6">
              <Input
                label="Trip Title"
                placeholder="e.g., Hidden Gems of Ninh Binh"
                tone="highest"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Destination"
                  placeholder="Where to?"
                  iconLeft="location_on"
                  tone="highest"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Start" type="date" tone="highest" />
                  <Input label="End" type="date" tone="highest" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Max Travelers" type="number" placeholder="8" tone="highest" />
                <Input
                  label="Est. Price (USD)"
                  type="number"
                  placeholder="1200"
                  tone="highest"
                />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest text-on-surface-variant uppercase mb-2 ml-1">
                  Story & Description
                </label>
                <textarea
                  rows={4}
                  className="w-full px-6 py-4 rounded-2xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/40 focus:outline-none text-on-surface transition-all resize-none"
                  placeholder="Tell the community about the vibe of this trip..."
                />
              </div>
            </div>
          </section>

          {/* Section 2: Itinerary */}
          <section className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <SectionHeader icon="calendar_today" title="The Itinerary" />
              <button
                type="button"
                className="flex items-center gap-2 text-primary font-bold px-4 py-2 hover:bg-surface-container-low rounded-full transition-all"
              >
                <Icon name="add_circle" />
                Add Day
              </button>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-surface-container-low px-8 py-4 flex justify-between items-center">
                <h3 className="font-headline font-bold text-lg">Day 1: Arrival & Welcome Dinner</h3>
                <button type="button" className="text-on-surface-variant hover:text-error transition-colors">
                  <Icon name="delete" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex gap-6 items-start">
                  <div className="flex flex-col items-center pt-2">
                    <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/20" />
                    <div className="w-0.5 h-16 bg-outline-variant/30 mt-2" />
                  </div>
                  <div className="flex-1 bg-surface-container-low/50 p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <input
                        type="text"
                        defaultValue="Pick up at Noi Bai International Airport"
                        className="bg-transparent border-none p-0 focus:ring-0 outline-none font-bold text-on-surface w-full"
                      />
                      <span className="text-xs font-bold text-primary px-2 py-1 bg-primary-container/20 rounded">
                        14:00
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      defaultValue="Our private van will meet you at arrivals with a ViệtVibe sign."
                      className="bg-transparent border-none p-0 focus:ring-0 outline-none text-sm text-on-surface-variant w-full resize-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full border-2 border-dashed border-outline-variant/30 p-4 rounded-xl hover:bg-surface-container-low transition-colors group"
                >
                  <div className="flex items-center justify-center gap-2 text-on-surface-variant/60 group-hover:text-primary transition-colors">
                    <Icon name="add" />
                    <span className="font-bold text-sm uppercase tracking-widest">Add Activity</span>
                  </div>
                </button>
              </div>
            </div>
          </section>

          {/* Action bar */}
          <div className="flex items-center gap-4 py-4">
            <Button variant="secondary" className="flex-1" size="lg">
              Save Draft
            </Button>
            <Button className="flex-[2]" size="lg">
              Publish Trip
            </Button>
          </div>
        </form>

        {/* Right: progress sidebar */}
        <aside className="lg:col-span-4">
          <div className="sticky top-28 bg-surface-container-low p-6 rounded-2xl">
            <h4 className="font-headline font-bold mb-4">Trip Completion</h4>
            <div className="w-full bg-surface-container-highest rounded-full h-2 mb-6">
              <div className="editorial-gradient h-2 rounded-full w-[45%]" />
            </div>
            <ul className="space-y-3 text-sm">
              {[
                ['Trip basics', true],
                ['Itinerary outline', true],
                ['Visual gallery', false],
                ['Pricing & inclusions', false],
              ].map(([label, done]) => (
                <li key={String(label)} className="flex items-center gap-2">
                  <Icon
                    name={done ? 'check_circle' : 'radio_button_unchecked'}
                    className={done ? 'text-primary fill' : 'text-on-surface-variant'}
                    size={20}
                  />
                  <span className={done ? 'text-on-surface' : 'text-on-surface-variant'}>
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
