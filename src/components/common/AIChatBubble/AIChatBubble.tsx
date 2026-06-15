import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { ROUTES, tripDetailPath } from '@constants/routes'
import { useAIAssistantStore, type AIMessage } from '@store/aiAssistantStore'
import { useAuthStore } from '@store/authStore'
import { aiAssistantService, askAssistant } from '@services/aiAssistantService'
import { cn } from '@utils/cn'
import type { Trip } from '@types/trip'
import type { AiTripSuggestion, ChatTurn } from '@services/aiAssistantService'

const QUICK_PROMPTS = [
  'Có chuyến nào đi Đà Lạt không?',
  'Gợi ý lộ trình Sapa 3 ngày',
  'Ẩm thực Hội An cuối tuần',
  'Phiêu lưu Hà Giang',
]

const HISTORY_TURNS = 8
const formatVnd = (n?: number) => (n ? `₫${n.toLocaleString('vi-VN')}` : '—')

/**
 * Floating AI assistant bubble — visible on every page (when enabled).
 * Tap FAB to open a popover chat that suggests trips based on user query.
 */
export function AIChatBubble() {
  const enabled = useAIAssistantStore((s) => s.enabled)
  const isOpen = useAIAssistantStore((s) => s.isOpen)
  const messages = useAIAssistantStore((s) => s.messages)
  const open = useAIAssistantStore((s) => s.open)
  const close = useAIAssistantStore((s) => s.close)
  const setEnabled = useAIAssistantStore((s) => s.setEnabled)
  const addMessage = useAIAssistantStore((s) => s.addMessage)
  const updateMessage = useAIAssistantStore((s) => s.updateMessage)
  const clearMessages = useAIAssistantStore((s) => s.clearMessages)

  const [input, setInput] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [creatingId, setCreatingId] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Auto-scroll on new message
  useEffect(() => {
    if (!isOpen) return
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isOpen])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  if (!enabled) return null

  const handleSend = async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    setInput('')
    setBusy(true)

    const userMsg: AIMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      createdAt: Date.now(),
    }
    addMessage(userMsg)

    const pendingId = `a-${Date.now()}`
    addMessage({
      id: pendingId,
      role: 'assistant',
      content: '',
      pending: true,
      createdAt: Date.now(),
    })

    // Build context from the recent N turns (drop the synthetic welcome and
    // the still-pending assistant placeholder we just inserted).
    const history: ChatTurn[] = messages
      .filter((m) => m.id !== 'welcome' && !m.pending)
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.content }))

    // Draft đang dựng dở = suggestion của tin nhắn assistant gần nhất CHƯA tạo
    // chuyến. Gửi kèm để bot biết user đang chỉnh sửa / chốt cho lộ trình nào.
    const activeDraft = [...messages]
      .reverse()
      .find((m) => m.suggestion && !m.createdTripId)?.suggestion

    try {
      const res = await askAssistant(content, history, activeDraft)
      updateMessage(pendingId, {
        content: res.answer,
        trips: res.trips,
        intent: res.intent,
        suggestion: res.suggestion,
        pending: false,
      })
    } catch {
      updateMessage(pendingId, {
        content: 'Có lỗi khi tìm gợi ý. Bạn thử lại nhé.',
        pending: false,
      })
    } finally {
      setBusy(false)
    }
  }

  /** Materialize the bot's draft into a real Trip and navigate there. */
  const handleCreateTrip = async (messageId: string, draft: AiTripSuggestion) => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN)
      return
    }
    if (creatingId) return
    setCreatingId(messageId)
    try {
      const trip = await aiAssistantService.createTrip(draft)
      updateMessage(messageId, {
        createdTripId: trip.id,
        createdTripTitle: trip.title,
      })
      // Confirmation message in the chat thread
      addMessage({
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: `Mình đã tạo chuyến "${trip.title}" rồi nhé. Bạn vào trang chuyến để mời bạn bè cùng đi nha 🎉`,
        createdAt: Date.now(),
      })
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Tạo chuyến thất bại, bạn thử lại nhé.'
      addMessage({
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: msg,
        createdAt: Date.now(),
      })
    } finally {
      setCreatingId(null)
    }
  }

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <button
          type="button"
          onClick={open}
          aria-label="Mở trợ lý AI"
          className="fixed z-40 right-4 md:right-6 bottom-24 md:bottom-6 editorial-gradient text-on-primary w-14 h-14 rounded-full shadow-editorial-lg flex items-center justify-center active:scale-95 transition-transform hover:scale-105"
        >
          <Icon name="auto_awesome" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-tertiary ring-2 ring-surface" />
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Trợ lý du lịch AI"
          className="fixed z-40 right-4 md:right-6 bottom-24 md:bottom-6 w-[calc(100vw-2rem)] sm:w-[380px] h-[560px] max-h-[calc(100vh-8rem)] bg-surface-container-lowest rounded-3xl shadow-editorial-lg border border-outline-variant/15 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <header className="flex items-center gap-3 px-4 py-3 editorial-gradient text-on-primary">
            <span className="w-9 h-9 rounded-full bg-on-primary/15 flex items-center justify-center">
              <Icon name="auto_awesome" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-headline font-extrabold leading-tight">Trợ lý du lịch</p>
              <p className="text-[11px] text-on-primary/80">Gợi ý chuyến đi theo ý bạn</p>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Tuỳ chọn"
                className="w-8 h-8 rounded-full hover:bg-on-primary/15 flex items-center justify-center"
              >
                <Icon name="more_vert" size={18} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-48 bg-surface-container-lowest text-on-surface rounded-2xl shadow-editorial-lg border border-outline-variant/15 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages()
                      setMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-surface-container-low text-left"
                  >
                    <Icon name="restart_alt" size={16} />
                    Xoá hội thoại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setEnabled(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-error/10 text-error text-left"
                  >
                    <Icon name="visibility_off" size={16} />
                    Tắt trợ lý
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={close}
              aria-label="Đóng"
              className="w-8 h-8 rounded-full hover:bg-on-primary/15 flex items-center justify-center"
            >
              <Icon name="close" size={18} />
            </button>
          </header>

          {/* Body */}
          <div
            ref={bodyRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-surface-container-lowest to-surface-container-low/40"
          >
            {messages.map((m) => (
              <MessageRow
                key={m.id}
                message={m}
                onCreateTrip={() => m.suggestion && handleCreateTrip(m.id, m.suggestion)}
                creating={creatingId === m.id}
              />
            ))}

            {messages.length <= 1 && (
              <div className="pt-2">
                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Gợi ý nhanh
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSend(p)}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container text-on-surface hover:bg-primary hover:text-on-primary transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend(input)
            }}
            className="border-t border-outline-variant/15 p-3 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi về chuyến đi của bạn…"
              disabled={busy}
              className="flex-1 px-4 py-2.5 rounded-full bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Gửi"
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-on-primary transition active:scale-95',
                busy || !input.trim()
                  ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                  : 'editorial-gradient hover:scale-105'
              )}
            >
              <Icon name={busy ? 'hourglass_empty' : 'send'} size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function MessageRow({
  message,
  onCreateTrip,
  creating,
}: {
  message: AIMessage
  onCreateTrip: () => void
  creating: boolean
}) {
  const fromUser = message.role === 'user'
  return (
    <div className={cn('flex flex-col gap-2', fromUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
          fromUser
            ? 'bg-primary text-on-primary rounded-br-sm'
            : 'bg-surface-container text-on-surface rounded-bl-sm'
        )}
      >
        {message.pending ? <TypingDots /> : message.content}
      </div>

      {message.trips && message.trips.length > 0 && (
        <div className="w-full grid grid-cols-1 gap-2 mt-1">
          {message.trips.map((t) => (
            <TripSuggestionCard key={t.id} trip={t} />
          ))}
        </div>
      )}

      {message.suggestion && (
        <SuggestionCard
          suggestion={message.suggestion}
          createdTripId={message.createdTripId}
          createdTripTitle={message.createdTripTitle}
          creating={creating}
          onCreate={onCreateTrip}
        />
      )}
    </div>
  )
}

function SuggestionCard({
  suggestion,
  createdTripId,
  createdTripTitle,
  creating,
  onCreate,
}: {
  suggestion: AiTripSuggestion
  createdTripId?: string
  createdTripTitle?: string
  creating: boolean
  onCreate: () => void
}) {
  return (
    <div className="w-full bg-surface-container-lowest border border-primary/30 rounded-2xl shadow-editorial overflow-hidden">
      {suggestion.coverImage && (
        <img
          src={suggestion.coverImage}
          alt={suggestion.title}
          className="w-full h-28 object-cover"
          loading="lazy"
        />
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
          <Icon name="auto_awesome" size={12} className="fill" />
          Lộ trình AI gợi ý
        </div>
        <p className="font-headline font-extrabold text-on-surface leading-tight">
          {suggestion.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant">
          <span className="inline-flex items-center gap-0.5">
            <Icon name="location_on" size={12} />
            {suggestion.destination}
          </span>
          <span>·</span>
          <span>{suggestion.durationDays}N</span>
          {suggestion.estimatedBudget != null && (
            <>
              <span>·</span>
              <span>{formatVnd(suggestion.estimatedBudget)}/người</span>
            </>
          )}
        </div>
        <p className="text-xs text-on-surface/85 line-clamp-3">{suggestion.summary}</p>

        {suggestion.inclusions &&
          (suggestion.inclusions.accommodation ||
            suggestion.inclusions.transport ||
            suggestion.inclusions.meals) && (
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {suggestion.inclusions.accommodation && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                  <Icon name="hotel" size={12} />
                  {suggestion.inclusions.accommodation}
                </span>
              )}
              {suggestion.inclusions.transport && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                  <Icon name="directions_bus" size={12} />
                  {suggestion.inclusions.transport}
                </span>
              )}
              {suggestion.inclusions.meals && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                  <Icon name="restaurant" size={12} />
                  {suggestion.inclusions.meals}
                </span>
              )}
            </div>
          )}

        {suggestion.itinerary && suggestion.itinerary.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer font-bold text-primary">
              Xem lịch trình {suggestion.itinerary.length} ngày
            </summary>
            <ol className="mt-2 space-y-1.5 pl-1">
              {suggestion.itinerary.map((d) => (
                <li key={d.dayNumber} className="border-l-2 border-primary/30 pl-2">
                  <p className="font-bold text-on-surface">
                    Ngày {d.dayNumber}: {d.title}
                  </p>
                  {d.activities && d.activities.length > 0 && (
                    <ul className="text-[11px] text-on-surface-variant mt-0.5 space-y-0.5">
                      {d.activities.slice(0, 4).map((a, i) => (
                        <li key={i}>
                          <span className="font-bold">{a.time}</span> · {a.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </details>
        )}

        {createdTripId ? (
          <Link
            to={tripDetailPath(createdTripId)}
            className="w-full mt-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold bg-primary/10 text-primary hover:bg-primary/15"
          >
            <Icon name="check_circle" size={14} className="fill" />
            Đã tạo "{createdTripTitle ?? 'chuyến mới'}" — Mở xem
          </Link>
        ) : (
          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className={cn(
              'w-full mt-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold transition active:scale-95',
              creating
                ? 'bg-surface-container-high text-on-surface-variant cursor-wait'
                : 'editorial-gradient text-on-primary hover:scale-[1.01]'
            )}
          >
            <Icon name={creating ? 'hourglass_empty' : 'add_circle'} size={14} />
            {creating ? 'Đang tạo…' : 'Tạo chuyến luôn'}
          </button>
        )}
      </div>
    </div>
  )
}

function TripSuggestionCard({ trip }: { trip: Trip }) {
  return (
    <Link
      to={tripDetailPath(trip.id)}
      className="flex gap-3 p-2 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 hover:shadow-editorial transition group"
    >
      <img
        src={trip.coverImage}
        alt={trip.title}
        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="font-headline font-bold text-sm text-on-surface line-clamp-1 group-hover:text-primary">
          {trip.title}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-on-surface-variant mt-0.5">
          <span className="inline-flex items-center gap-0.5">
            <Icon name="location_on" size={12} />
            {trip.destination}
          </span>
          <span>·</span>
          <span>{trip.durationDays}N</span>
          <span>·</span>
          <span className="inline-flex items-center gap-0.5">
            <Icon name="star" size={12} className="fill text-[#ffb000]" />
            {trip.rating}
          </span>
        </div>
        <p className="text-xs font-extrabold text-primary mt-1">
          từ {trip.currency}
          {trip.priceFrom}
        </p>
      </div>
    </Link>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce" />
    </span>
  )
}
