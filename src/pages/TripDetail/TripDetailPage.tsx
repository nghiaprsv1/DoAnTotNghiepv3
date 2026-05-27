import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { ReviewModal } from '@components/features/ReviewModal'
import type { ReviewTarget } from '@components/features/ReviewModal'
import { mockTrips } from '@constants/mockData'
import { TripGuidePanel } from './components/TripGuidePanel'
import { MembersPanel } from './components/MembersPanel'
import { JoinPanel } from './components/JoinPanel'
import { JoinedPanel } from './components/JoinedPanel'

const IMG =
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80'

const days = [
  {
    title: 'Day 1: Arrival & Sunset Glow',
    subtitle: 'Embracing the Pearl',
    items: [
      ['09:00', 'Pick up at Phu Quoc International Airport and transfer to Long Beach.'],
      ['12:30', 'Seafood lunch at a local garden restaurant.'],
      ['17:00', 'Sunset cocktails at Sunset Sanato — the most Instagrammable spot on the island.'],
    ],
  },
  {
    title: 'Day 2: Island Hopping',
    subtitle: 'The An Thoi Archipelago',
    items: [
      ['08:30', 'Canoe trip to Mong Tay, May Rut, and Dam Ngang islands.'],
      ['14:00', 'Coral reef snorkeling and underwater photography session.'],
      ['19:00', 'BBQ dinner on a private beach under the stars.'],
    ],
  },
]

export function TripDetailPage() {
  const { id } = useParams()
  const baseTrip = mockTrips.find((t) => t.id === id) || mockTrips[0]

  // Local "joined" state — overrides mock's isJoined so the user can join/leave in UI demo.
  const [joined, setJoined] = useState<boolean>(!!baseTrip.isJoined)
  const [memberCount, setMemberCount] = useState<number>(baseTrip.memberCount)
  // Demo: pretend trip already finished — unlocks cross-rating between members.
  const [tripCompleted, setTripCompleted] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)

  const trip = { ...baseTrip, isJoined: joined, memberCount }
  const isFull = memberCount >= trip.maxMembers

  const handleJoin = () => {
    if (isFull) return
    setJoined(true)
    setMemberCount((c) => c + 1)
  }

  const handleLeave = () => {
    setJoined(false)
    setMemberCount((c) => Math.max(0, c - 1))
  }

  return (
    <div className="flex-grow">
      {/* Hero */}
      <section className="relative h-[500px] md:h-[614px] w-full overflow-hidden">
        <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {joined && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest shadow-editorial">
                <Icon name="check_circle" size={12} className="fill" />
                Đã tham gia
              </span>
            )}
            {trip.tags.map((tag) => (
              <Badge key={tag} variant="glass" size="md">
                {tag}
              </Badge>
            ))}
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4 tracking-tighter font-headline">
            {trip.title}
          </h1>
          <p className="text-white/90 text-lg md:text-xl max-w-2xl italic">"{trip.description}"</p>
        </div>
      </section>

      {/* Content grid */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: main content */}
        <div className="lg:col-span-8">
          <article className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-primary tracking-tight font-headline">
              Trải nghiệm
            </h2>
            <div className="max-w-none text-on-surface leading-relaxed text-lg">
              <p className="mb-4">
                {trip.destination} không chỉ là điểm đến — nó là một nơi để dừng lại và lắng nghe.
                Trong {trip.durationDays} ngày, chúng ta sẽ đi qua những góc khuất và năng lượng
                rực rỡ nhất của vùng đất, cân bằng giữa phiêu lưu và bình yên.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['hotel', 'Lưu trú', 'Resort 5*'],
                ['directions_boat', 'Di chuyển', 'Du thuyền riêng'],
                ['restaurant', 'Bữa ăn', 'Trọn gói'],
                ['group', 'Quy mô', `${trip.maxMembers} người`],
              ].map(([icon, label, value]) => (
                <div key={label} className="bg-surface-container-low p-4 rounded-xl text-center">
                  <Icon name={icon} className="text-primary mb-2" />
                  <p className="text-xs font-bold uppercase text-on-surface-variant">{label}</p>
                  <p className="font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </article>

          {/* Itinerary */}
          <section className="space-y-12 mb-16">
            <h2 className="text-3xl font-bold text-primary tracking-tight font-headline">
              Lịch trình hằng ngày
            </h2>
            {days.map((d, idx) => (
              <div key={d.title} className="relative pl-12 border-l-4 border-surface-container">
                <div className="absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-primary ring-4 ring-background" />
                <span className="text-xs font-bold text-primary-container tracking-widest uppercase">
                  {d.title}
                </span>
                <h3 className="text-2xl font-bold mt-1 mb-4 font-headline">{d.subtitle}</h3>
                <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm">
                  {idx === 0 && (
                    <img src={IMG} alt="" className="w-full h-48 object-cover rounded-xl mb-4" />
                  )}
                  <ul className="space-y-3 text-on-surface">
                    {d.items.map(([time, text]) => (
                      <li key={time} className="flex gap-3">
                        <span className="font-bold text-primary">{time}</span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Right: sidebar */}
        <aside className="lg:col-span-4 space-y-8">
          {joined ? (
            <JoinedPanel trip={trip} onLeave={handleLeave} />
          ) : (
            <JoinPanel trip={trip} onJoin={handleJoin} isFull={isFull} />
          )}

          {/* Post-trip review CTA */}
          {joined && (
            <section className="bg-surface-container-lowest rounded-3xl p-5 shadow-editorial">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h4 className="font-headline font-extrabold text-on-surface">
                    Sau chuyến đi
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Demo: bật để mở tính năng đánh giá
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTripCompleted((v) => !v)}
                  aria-pressed={tripCompleted}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    tripCompleted ? 'bg-primary' : 'bg-surface-container-high'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      tripCompleted ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>

              {tripCompleted ? (
                <div className="space-y-2">
                  <Button
                    size="md"
                    rounded="full"
                    className="w-full"
                    onClick={() =>
                      setReviewTarget({
                        kind: 'trip',
                        name: trip.title,
                        image: trip.coverImage,
                        context: trip.destination,
                      })
                    }
                  >
                    <Icon name="rate_review" size={16} />
                    Đánh giá chuyến đi
                  </Button>
                  {trip.guide && (
                    <Button
                      variant="secondary"
                      size="md"
                      rounded="full"
                      className="w-full"
                      onClick={() =>
                        setReviewTarget({
                          kind: 'guide',
                          name: trip.guide!.name,
                          image: trip.guide!.avatar,
                          context: `Tour: ${trip.title}`,
                        })
                      }
                    >
                      <Icon name="star" size={16} />
                      Đánh giá HDV
                    </Button>
                  )}
                  <p className="text-[11px] text-on-surface-variant text-center pt-1">
                    Đánh giá thành viên trong panel bên dưới
                  </p>
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant">
                  Khi chuyến đi kết thúc, bạn sẽ có thể đánh giá HDV, chuyến đi và những người đi cùng.
                </p>
              )}
            </section>
          )}

          {trip.guide && <TripGuidePanel guide={trip.guide} isJoined={joined} />}

          <MembersPanel
            members={trip.members}
            creator={trip.creator}
            memberCount={memberCount}
            maxMembers={trip.maxMembers}
            tripCompleted={joined && tripCompleted}
            tripTitle={trip.title}
          />
        </aside>
      </div>

      <ReviewModal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        target={reviewTarget ?? { kind: 'trip', name: '' }}
      />
    </div>
  )
}
