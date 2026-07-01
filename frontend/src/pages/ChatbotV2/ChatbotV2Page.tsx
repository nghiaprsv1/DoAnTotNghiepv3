import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { RichText } from '@components/common/RichText'
import { ROUTES } from '@constants/routes'
import { cn } from '@utils/cn'
import { useAuthStore } from '@store/authStore'
import {
  ragV2Service,
  type DocSearchDetail,
  type RagAskResult,
  type RagCard,
  type RagItinerary,
  type RagStatus,
  type RagStep,
} from '@services/ragV2Service'

interface ChatItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  trace?: RagAskResult['trace']
  cards?: RagCard[]
  suggestion?: RagItinerary
  pending?: boolean
  error?: boolean
}

const SAMPLE_QUESTIONS = [
  'Đà Nẵng có địa điểm nào nổi tiếng?',
  'Giá vé vào Bà Nà Hills bao nhiêu?',
  'Cầu Rồng phun lửa lúc mấy giờ?',
  'Tạo giúp mình lộ trình Đà Nẵng 3 ngày',
  'Tìm hướng dẫn viên khu vực miền Trung',
  'Tôi cần lưu ý gì khi đi du lịch vùng núi?',
]

/**
 * Trang chatbot RAG v2 (thử nghiệm) — ĐỘC LẬP với website hiện tại.
 * Hiển thị RÕ phương pháp thực thi RAG: chunking → embedding → vector search
 * (cosine) → ghép ngữ cảnh → sinh câu trả lời, kèm điểm similarity & thời gian.
 */
export function ChatbotV2Page() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin')
  const [messages, setMessages] = useState<ChatItem[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<RagStatus | null>(null)
  const [ingesting, setIngesting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const loadStatus = async () => {
    try {
      setStatus(await ragV2Service.status())
    } catch {
      setStatus(null)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleIngest = async () => {
    if (ingesting) return
    setIngesting(true)
    setNotice(null)
    try {
      const res = await ragV2Service.ingest()
      setNotice(
        `Đã nạp ${res.totalChunks} chunk từ ${res.documents.length} tài liệu (model: ${res.embeddingModel}).`,
      )
      await loadStatus()
    } catch (err) {
      setNotice(errMsg(err, 'Nạp tài liệu thất bại.'))
    } finally {
      setIngesting(false)
    }
  }

  const handleSend = async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    setInput('')
    setBusy(true)

    const userMsg: ChatItem = { id: `u-${Date.now()}`, role: 'user', content }
    const pendingId = `a-${Date.now()}`
    // Lộ trình đang dựng gần nhất (nếu có) → gửi kèm để bot CHỈNH thay vì dựng mới.
    const draft =
      [...messages].reverse().find((m) => m.role === 'assistant' && m.suggestion)?.suggestion ??
      null
    // Lịch sử hội thoại (bỏ lượt pending/rỗng) → agent hiểu câu nối tiếp.
    const history = messages
      .filter((m) => !m.pending && m.content?.trim())
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }))
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: pendingId, role: 'assistant', content: '', pending: true },
    ])

    try {
      const res = await ragV2Service.ask(content, draft, history)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                ...m,
                content: res.answer,
                trace: res.trace,
                cards: res.cards,
                suggestion: res.suggestion,
                pending: false,
              }
            : m,
        ),
      )
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? { ...m, content: errMsg(err, 'Có lỗi khi hỏi RAG.'), pending: false, error: true }
            : m,
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-container-low text-on-surface flex flex-col">
      {/* Header */}
      <header className="editorial-gradient text-on-primary">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-on-primary/15 flex items-center justify-center">
            <Icon name="neurology" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-headline font-extrabold text-xl leading-tight">
                Chatbot RAG v2
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-on-primary/20 px-2 py-0.5 rounded-full">
                Thử nghiệm
              </span>
            </div>
            <p className="text-[12px] text-on-primary/85">
              Modular RAG · router + đa nguồn (tài liệu + chuyến/địa điểm/HDV/bài viết) + rerank
            </p>
          </div>
          <Link
            to={ROUTES.HOME}
            className="text-[12px] font-bold inline-flex items-center gap-1 hover:underline"
          >
            <Icon name="arrow_back" size={16} />
            Về trang chủ
          </Link>
        </div>
      </header>

      {/* Status bar */}
      <StatusBar
        status={status}
        ingesting={ingesting}
        onIngest={handleIngest}
        notice={notice}
        canIngest={isAdmin}
      />

      {/* Body */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-5">
        <div className="grid lg:grid-cols-[minmax(0,1fr)] gap-4">
          {/* Pipeline diagram (luôn hiển thị để minh hoạ phương pháp) */}
          <PipelineLegend />

          {/* Chat thread */}
          <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/20 shadow-editorial flex flex-col overflow-hidden">
            <div
              ref={bodyRef}
              className="flex-1 overflow-y-auto px-4 py-5 space-y-5 min-h-[40vh] max-h-[60vh]"
            >
              {messages.length === 0 && (
                <EmptyState onPick={handleSend} disabled={busy} />
              )}
              {messages.map((m) => (
                <MessageRow key={m.id} item={m} />
              ))}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend(input)
              }}
              className="border-t border-outline-variant/15 p-3 flex items-center gap-2 bg-surface-container-lowest"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi về địa điểm, chuyến đi, HDV, lộ trình hoặc cách dùng web…"
                disabled={busy}
                className="flex-1 px-4 py-3 rounded-2xl bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Gửi"
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center text-on-primary transition active:scale-95',
                  busy || !input.trim()
                    ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                    : 'editorial-gradient hover:scale-105',
                )}
              >
                <Icon name={busy ? 'hourglass_empty' : 'send'} size={20} />
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}

function errMsg(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
  )
}

/** ISO yyyy-mm-dd → dd/mm/yyyy (hiển thị ngày kiểu Việt). */
function formatVnDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

/* ─────────────────────── Status bar ─────────────────────── */

function StatusBar({
  status,
  ingesting,
  onIngest,
  notice,
  canIngest,
}: {
  status: RagStatus | null
  ingesting: boolean
  onIngest: () => void
  notice: string | null
  canIngest: boolean
}) {
  const geminiOk = status?.geminiConfigured
  return (
    <div className="border-b border-outline-variant/15 bg-surface-container-lowest">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3 text-[12px]">
        <Pill
          icon={geminiOk ? 'check_circle' : 'error'}
          tone={geminiOk ? 'ok' : 'err'}
          label={geminiOk ? 'Gemini đã cấu hình' : 'Thiếu GEMINI_API_KEY'}
        />
        {status && (
          <>
            <Pill icon="density_small" label={`Embedding: ${status.embeddingModel}`} />
            <Pill icon="chat" label={`Chat: ${status.chatModel}`} />
            <Pill
              icon="dataset"
              tone={status.totalChunks > 0 ? 'ok' : 'warn'}
              label={`${status.totalChunks} chunk · ${status.documents.length} tài liệu`}
            />
          </>
        )}
        <button
          type="button"
          onClick={onIngest}
          disabled={ingesting || !geminiOk}
          className={cn(
            'ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition',
            !canIngest && 'hidden',
            ingesting || !geminiOk
              ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
              : 'bg-primary text-on-primary hover:scale-[1.02]',
          )}
        >
          <Icon name={ingesting ? 'hourglass_empty' : 'cloud_sync'} size={16} />
          {ingesting ? 'Đang nạp…' : 'Nạp / Re-index tài liệu'}
        </button>
      </div>
      {notice && (
        <div className="max-w-6xl mx-auto px-4 pb-3 -mt-1">
          <p className="text-[12px] text-on-surface-variant bg-surface-container-low rounded-xl px-3 py-2">
            {notice}
          </p>
        </div>
      )}
      {status && status.totalChunks === 0 && geminiOk && (
        <div className="max-w-6xl mx-auto px-4 pb-3 -mt-1">
          <p className="text-[12px] text-tertiary bg-tertiary/10 rounded-xl px-3 py-2">
            Vector store đang rỗng. Bấm "Nạp / Re-index tài liệu" để vector hoá các file trong
            thư mục documemtRAG/ trước khi hỏi.
          </p>
        </div>
      )}
    </div>
  )
}

function Pill({
  icon,
  label,
  tone = 'neutral',
}: {
  icon: string
  label: string
  tone?: 'ok' | 'warn' | 'err' | 'neutral'
}) {
  const toneCls =
    tone === 'ok'
      ? 'bg-primary/10 text-primary'
      : tone === 'warn'
        ? 'bg-tertiary/15 text-tertiary'
        : tone === 'err'
          ? 'bg-error/10 text-error'
          : 'bg-surface-container text-on-surface-variant'
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold', toneCls)}
    >
      <Icon name={icon} size={14} />
      {label}
    </span>
  )
}

/* ─────────────────────── Pipeline legend ─────────────────────── */

/**
 * Sơ đồ phương pháp — phản ánh ĐÚNG kiến trúc AGENT (tool-calling/ReAct) mà bong
 * bóng chat đang chạy: viết lại/định tuyến → vòng lặp LLM tự chọn công cụ (4 bộ
 * truy hồi DB + tra tài liệu vector + dựng lộ trình) → chốt câu trả lời + lọc thẻ.
 * (KHÁC pipeline tuyến tính 7 bước cũ — chỉ chạy khi RAGV2_AGENT=false.)
 */
const PIPELINE_STAGES = [
  { icon: 'edit_note', title: 'Viết lại + định tuyến', sub: 'rewrite + chọn nguồn' },
  { icon: 'smart_toy', title: 'Agent (LLM)', sub: 'tự quyết gọi công cụ' },
  { icon: 'build', title: 'Gọi công cụ', sub: 'DB / tài liệu / lộ trình' },
  { icon: 'visibility', title: 'Quan sát', sub: 'nhồi kết quả lại LLM' },
  { icon: 'auto_awesome', title: 'Chốt trả lời', sub: 'sinh đáp án + lọc thẻ' },
]

function PipelineLegend() {
  return (
    <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/20 p-4">
      <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">
        Phương pháp thực thi · Agent tool-calling (ReAct)
      </p>
      <div className="flex flex-wrap items-stretch gap-2">
        {PIPELINE_STAGES.map((s, i) => {
          // Bước 2-4 là vòng lặp (có thể lặp nhiều lần) → đánh dấu mũi tên quay lại.
          const loopBack = i === 3
          return (
            <div key={s.title} className="flex items-center gap-2">
              <div className="flex flex-col items-center text-center w-24 rounded-2xl bg-surface-container-low px-2 py-2.5">
                <Icon name={s.icon} className="text-primary" size={20} />
                <span className="text-[12px] font-bold mt-1 leading-tight">{s.title}</span>
                <span className="text-[10px] text-on-surface-variant leading-tight">{s.sub}</span>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <Icon
                  name={loopBack ? 'autorenew' : 'arrow_forward'}
                  size={16}
                  className={loopBack ? 'text-tertiary' : 'text-outline'}
                />
              )}
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-on-surface-variant mt-2.5 leading-relaxed">
        <Icon name="autorenew" size={12} className="inline text-tertiary" /> Các bước{' '}
        <b>Agent → Gọi công cụ → Quan sát</b> lặp lại nhiều vòng đến khi LLM đủ dữ liệu để trả lời.
        Mỗi câu hỏi agent tự chọn công cụ phù hợp (không cố định thứ tự).
      </p>
    </section>
  )
}

/* ─────────────────────── Empty state ─────────────────────── */

function EmptyState({
  onPick,
  disabled,
}: {
  onPick: (q: string) => void
  disabled: boolean
}) {
  return (
    <div className="text-center py-6">
      <span className="inline-flex w-14 h-14 rounded-2xl editorial-gradient text-on-primary items-center justify-center mb-3">
        <Icon name="neurology" />
      </span>
      <p className="font-headline font-extrabold text-lg">Hỏi đáp có hiển thị quá trình</p>
      <p className="text-[13px] text-on-surface-variant max-w-md mx-auto mt-1">
        Đây là CÙNG bộ não với bong bóng chat trên web (agent tự gọi công cụ). Mỗi câu trả lời kèm
        bảng "Phương pháp thực thi": viết lại câu hỏi, agent chọn & gọi công cụ nào, kết quả công cụ
        trả về (observation), và bước chốt câu trả lời + lọc thẻ.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onPick(q)}
            className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-surface-container text-on-surface hover:bg-primary hover:text-on-primary transition disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────── Message row ─────────────────────── */

function MessageRow({ item }: { item: ChatItem }) {
  const fromUser = item.role === 'user'
  return (
    <div className={cn('flex flex-col gap-2', fromUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[88%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
          fromUser
            ? 'bg-primary text-on-primary rounded-br-sm whitespace-pre-wrap'
            : item.error
              ? 'bg-error/10 text-error rounded-bl-sm whitespace-pre-wrap'
              : 'bg-surface-container text-on-surface rounded-bl-sm',
        )}
      >
        {item.pending ? (
          <TypingDots />
        ) : fromUser || item.error ? (
          item.content
        ) : (
          <RichText text={item.content} />
        )}
      </div>
      {item.suggestion && <ItineraryCard suggestion={item.suggestion} />}
      {item.cards && item.cards.length > 0 && <ResultCards cards={item.cards} />}
      {item.trace && <TracePanel trace={item.trace} />}
    </div>
  )
}

/* ─────────────────────── Itinerary card (lộ trình v2 dựng) ─────────────────────── */

function ItineraryCard({ suggestion }: { suggestion: RagItinerary }) {
  const navigate = useNavigate()
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const [creating, setCreating] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!isAuthed) {
      navigate(ROUTES.LOGIN)
      return
    }
    setCreating(true)
    setErr(null)
    try {
      const trip = await ragV2Service.createTrip(suggestion)
      setCreatedId(trip.id)
    } catch (e) {
      setErr(errMsg(e, 'Tạo chuyến thất bại.'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="w-full mt-1 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 overflow-hidden">
      <div className="editorial-gradient text-on-primary px-4 py-3">
        <p className="font-headline font-extrabold text-sm">{suggestion.title}</p>
        <p className="text-[12px] text-on-primary/85">
          {suggestion.destination} · {suggestion.durationDays} ngày
          {suggestion.estimatedBudget
            ? ` · ~${Number(suggestion.estimatedBudget).toLocaleString('vi-VN')}đ/người`
            : ''}
        </p>
        {suggestion.startDate && (
          <p className="text-[12px] font-bold text-on-primary mt-0.5 inline-flex items-center gap-1">
            <Icon name="event" size={13} />
            {formatVnDate(suggestion.startDate)}
            {suggestion.endDate ? ` → ${formatVnDate(suggestion.endDate)}` : ''}
          </p>
        )}
      </div>
      {suggestion.summary && (
        <p className="px-4 pt-3 text-[12px] text-on-surface-variant">{suggestion.summary}</p>
      )}
      <ol className="px-4 py-3 space-y-2">
        {(suggestion.itinerary ?? []).map((day) => (
          <li key={day.dayNumber} className="rounded-xl bg-surface-container px-3 py-2">
            <p className="font-bold text-[12px] text-primary">
              Ngày {day.dayNumber}: {day.title}
            </p>
            <ul className="mt-1 space-y-0.5">
              {(day.activities ?? []).map((a, i) => (
                <li key={i} className="text-[11px] text-on-surface-variant">
                  <span className="font-bold">{a.time}</span> — {a.title}
                  {a.description ? `: ${a.description}` : ''}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <div className="px-4 pb-3">
        {!createdId && (
          <p className="text-[11px] text-on-surface-variant mb-2">
            💡 Muốn đổi gì? Nhắn ngay bên dưới (vd "khởi hành 20/12", "đổi ngày 2 sang biển",
            "thêm 1 ngày", "ngân sách 2 triệu") — mình sẽ cập nhật lộ trình.
          </p>
        )}
        {!createdId && !suggestion.startDate && (
          <p className="text-[11px] text-tertiary bg-tertiary/10 rounded-lg px-2.5 py-1.5 mb-2">
            ⚠️ Chưa có ngày khởi hành. Nhắn "khởi hành ngày…" để chốt, hoặc Tạo chuyến sẽ
            tự đặt mặc định (sau 7 ngày).
          </p>
        )}
        {createdId ? (
          <Link
            to={`/trips/${createdId}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-[12px] font-bold"
          >
            <Icon name="check_circle" size={16} />
            Đã tạo chuyến — xem chi tiết
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-[12px] transition',
              creating
                ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                : 'editorial-gradient text-on-primary hover:scale-[1.02]',
            )}
          >
            <Icon name={creating ? 'hourglass_empty' : 'add_circle'} size={16} />
            {creating ? 'Đang tạo…' : isAuthed ? 'Tạo chuyến' : 'Đăng nhập để tạo chuyến'}
          </button>
        )}
        {err && <p className="mt-1.5 text-[11px] text-error">{err}</p>}
      </div>
    </div>
  )
}

/* ─────────────────────── Result cards (chuyến/địa điểm/HDV/bài viết) ─────────────────────── */

const SOURCE_META: Record<RagCard['source'], { icon: string; label: string }> = {
  trip: { icon: 'luggage', label: 'Chuyến đi' },
  place: { icon: 'location_on', label: 'Địa điểm' },
  guide: { icon: 'badge', label: 'HDV' },
  post: { icon: 'article', label: 'Bài viết' },
  doc: { icon: 'description', label: 'Tài liệu' },
}

function ResultCards({ cards }: { cards: RagCard[] }) {
  return (
    <div className="w-full mt-1 grid sm:grid-cols-2 gap-2">
      {cards.map((c) => {
        const meta = SOURCE_META[c.source] ?? SOURCE_META.doc
        return (
          <Link
            key={`${c.source}-${c.id}`}
            to={c.detailPath}
            className="group flex gap-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 overflow-hidden hover:border-primary/40 hover:shadow-editorial transition"
          >
            {c.image ? (
              <img
                src={c.image}
                alt=""
                className="w-20 h-20 object-cover flex-shrink-0"
                loading="lazy"
              />
            ) : (
              <span className="w-20 h-20 flex-shrink-0 editorial-gradient text-on-primary flex items-center justify-center">
                <Icon name={meta.icon} />
              </span>
            )}
            <div className="flex-1 min-w-0 py-2 pr-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                <Icon name={meta.icon} size={12} />
                {meta.label}
              </span>
              <p className="font-bold text-[13px] text-on-surface line-clamp-1 group-hover:text-primary">
                {c.title}
              </p>
              <p className="text-[11px] text-on-surface-variant line-clamp-2">{c.subtitle}</p>
            </div>
          </Link>
        )
      })}
    </div>
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

/* ─────────────────────── Trace panel (phương pháp thực thi) ─────────────────────── */

function TracePanel({ trace }: { trace: RagAskResult['trace'] }) {
  return (
    <details className="w-full mt-1 bg-surface-container-low rounded-2xl border border-outline-variant/20 overflow-hidden" open>
      <summary className="cursor-pointer select-none px-4 py-2.5 flex items-center gap-2 text-[12px] font-bold text-on-surface hover:bg-surface-container">
        <Icon name="account_tree" size={16} className="text-primary" />
        Phương pháp thực thi · {trace.steps.length} bước · {trace.totalMs}ms
        <Icon name="expand_more" size={16} className="ml-auto text-on-surface-variant" />
      </summary>
      <ol className="px-4 pb-4 pt-1 space-y-3">
        {trace.steps.map((s, i) => (
          <StepCard key={s.key} step={s} order={i + 1} />
        ))}
      </ol>
    </details>
  )
}

function StepCard({ step, order }: { step: RagStep; order: number }) {
  return (
    <li className="relative pl-8">
      <span className="absolute left-0 top-0 w-6 h-6 rounded-full editorial-gradient text-on-primary text-[11px] font-bold flex items-center justify-center">
        {order}
      </span>
      <div className="flex items-center gap-2">
        <p className="font-bold text-[13px] text-on-surface">{step.title}</p>
        <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
          {step.ms}ms
        </span>
      </div>
      <div className="mt-1.5">{renderStepDetail(step)}</div>
    </li>
  )
}

function renderStepDetail(step: RagStep) {
  const d = step.detail
  if (step.key === 'agent_start') return <AgentStartDetail d={d} />
  if (step.key === 'agent_tool') return <AgentToolDetail d={d} />
  if (step.key === 'agent_final') return <AgentFinalDetail d={d} />
  if (step.key === 'query_rewrite') {
    const keywords = (d.keywords as string[]) ?? []
    const sources = (d.sources as string[]) ?? []
    const filters = (d.filters as Record<string, unknown>) ?? {}
    const viaLabel =
      d.via === 'llm' ? 'LLM định tuyến' : d.via === 'disabled' ? 'đã tắt' : 'fallback (luật)'
    const activeFilters = Object.entries(filters).filter(([, v]) => v != null && v !== '')
    return (
      <div className="text-[12px] text-on-surface-variant space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          <KV k="Phương thức" v={viaLabel} />
        </div>
        <div className="space-y-1">
          <p>
            <span className="font-bold">Gốc:</span> {String(d.original)}
          </p>
          <p>
            <span className="font-bold text-primary">Viết lại:</span> {String(d.rewritten)}
          </p>
        </div>
        {sources.length > 0 && (
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide">Nguồn định tuyến</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {sources.map((s, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold"
                >
                  {SOURCE_META[s as RagCard['source']]?.label ?? s}
                </span>
              ))}
            </div>
          </div>
        )}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activeFilters.map(([k, v]) => (
              <KV key={k} k={k} v={String(v)} />
            ))}
          </div>
        )}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {keywords.map((k, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary text-[11px] font-bold"
              >
                {k}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (step.key === 'db_retrieval') {
    const results = (d.results as { source: string; title: string; subtitle: string }[]) ?? []
    const perSource = (d.perSource as Record<string, number>) ?? {}
    return (
      <div className="text-[12px] text-on-surface-variant space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <KV k="Tổng kết quả" v={String(d.total)} />
          {Object.entries(perSource).map(([s, n]) => (
            <KV key={s} k={SOURCE_META[s as RagCard['source']]?.label ?? s} v={String(n)} />
          ))}
        </div>
        {results.length === 0 ? (
          <p className="text-[11px] italic">Không có kết quả DB cho câu này.</p>
        ) : (
          <div className="space-y-1">
            {results.map((r, i) => (
              <div key={i} className="rounded-lg bg-surface-container px-2.5 py-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-primary">
                  <Icon name={SOURCE_META[r.source as RagCard['source']]?.icon ?? 'database'} size={12} />
                  {SOURCE_META[r.source as RagCard['source']]?.label ?? r.source}
                </span>
                <p className="font-bold text-[12px] text-on-surface">{r.title}</p>
                <p className="text-[11px]">{r.subtitle}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (step.key === 'embed_query') {
    const preview = (d.preview as number[]) ?? []
    return (
      <div className="text-[12px] text-on-surface-variant space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          <KV k="Model" v={String(d.model)} />
          <KV k="Số chiều" v={String(d.dimensions)} />
        </div>
        {d.embeddedText != null && (
          <p>
            <span className="font-bold">Văn bản embed:</span> {String(d.embeddedText)}
          </p>
        )}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wide">Vector (8 chiều đầu)</span>
          <div className="flex flex-wrap gap-1 mt-1 font-mono">
            {preview.map((n, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-surface-container text-[11px]">
                {n}
              </span>
            ))}
            <span className="px-1.5 py-0.5 text-[11px]">…</span>
          </div>
        </div>
      </div>
    )
  }

  if (step.key === 'hybrid_search') {
    const results = (d.results as VectorResult[]) ?? []
    return (
      <div className="text-[12px] text-on-surface-variant space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <KV k="Phương pháp" v="cosine + BM25 · RRF" />
          <KV k="Ứng viên" v={String(d.candidates)} />
          <KV k="Giữ lại" v={String(d.candidateK)} />
        </div>
        <p className="text-[11px] leading-relaxed">{String(d.method)}</p>
        <div className="space-y-1.5">
          {results.map((r, i) => (
            <ChunkBar key={i} rank={i + 1} result={r} scoreLabel="RRF" />
          ))}
        </div>
      </div>
    )
  }

  if (step.key === 'rerank') {
    const results = (d.results as VectorResult[]) ?? []
    const viaLabel =
      d.via === 'cross-encoder'
        ? 'Cross-Encoder chấm điểm'
        : d.via === 'llm'
          ? 'LLM chấm điểm'
          : d.via === 'disabled'
            ? 'đã tắt (giữ RRF)'
            : 'fallback (giữ RRF)'
    return (
      <div className="text-[12px] text-on-surface-variant space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <KV k="Phương thức" v={viaLabel} />
          <KV k="Lọc" v={`${d.before} → ${d.after} chunk`} />
          <KV k="Ngưỡng" v={`≥ ${d.minScore}/10`} />
        </div>
        <p className="text-[11px] leading-relaxed text-tertiary">
          Loại các đoạn lọt vòng trước nhưng không thực sự trả lời câu hỏi → giảm rác đưa vào LLM.
        </p>
        <div className="space-y-1.5">
          {results.map((r, i) => (
            <ChunkBar key={i} rank={i + 1} result={r} scoreLabel="Liên quan" scoreMax={10} />
          ))}
        </div>
      </div>
    )
  }

  if (step.key === 'build_context') {
    const sources = (d.sources as string[]) ?? []
    return (
      <div className="text-[12px] text-on-surface-variant space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          <KV k="Số chunk dùng" v={String(d.chunksUsed)} />
          <KV k="Độ dài ngữ cảnh" v={`${d.contextChars} ký tự`} />
        </div>
        <div className="flex flex-wrap gap-1">
          {sources.map((s, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold"
            >
              {s}
            </span>
          ))}
        </div>
        {d.contextText != null && (
          <RawBox
            label="Ngữ cảnh GỬI cho Gemini (nguyên văn — model chỉ thấy đúng từng này)"
            text={String(d.contextText)}
          />
        )}
      </div>
    )
  }

  // generate
  const modeLabel =
    d.mode === 'extractive_fallback'
      ? 'trích xuất (fallback)'
      : d.mode === 'no_context'
        ? 'không đủ ngữ cảnh'
        : 'sinh bởi LLM'
  return (
    <div className="text-[12px] text-on-surface-variant space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <KV k="Model" v={String(d.model)} />
        <KV k="Chế độ" v={modeLabel} />
        <KV k="Bám ngữ cảnh" v={d.groundedOnContext ? 'có' : 'không'} />
        <KV k="Độ dài trả lời" v={`${d.answerChars} ký tự`} />
        {d.cardsRetrieved != null && (
          <KV k="Thẻ" v={`truy hồi ${d.cardsRetrieved} → LLM chọn ${d.cardsSelected}`} />
        )}
      </div>
      {d.sentSystem != null && String(d.sentSystem) && (
        <RawBox label="System prompt (chỉ thị cho Gemini)" text={String(d.sentSystem)} />
      )}
      {d.sentPrompt != null && String(d.sentPrompt) && (
        <RawBox
          label="Prompt GỬI cho Gemini (ngữ cảnh + câu hỏi — KHÔNG kèm file gốc)"
          text={String(d.sentPrompt)}
        />
      )}
      {d.note != null && (
        <p className="text-[11px] text-tertiary bg-tertiary/10 rounded-lg px-2 py-1">
          {String(d.note)}
        </p>
      )}
    </div>
  )
}

/** Bước khởi tạo agent: model + trần vòng + danh sách công cụ nạp cho LLM. */
function AgentStartDetail({ d }: { d: Record<string, unknown> }) {
  const tools = (d.tools as { name: string; description: string }[]) ?? []
  return (
    <div className="text-[12px] text-on-surface-variant space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <KV k="Model" v={String(d.model)} />
        <KV k="Trần số vòng" v={String(d.maxSteps)} />
        <KV k="Số công cụ" v={String(tools.length)} />
      </div>
      <div className="space-y-1">
        {tools.map((t, i) => (
          <div key={i} className="rounded-lg bg-surface-container px-2.5 py-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
              <Icon name="build" size={12} /> {t.name}
            </span>
            <p className="text-[11px]">{t.description}</p>
          </div>
        ))}
      </div>
      {d.systemPrompt != null && (
        <RawBox label="System prompt (chỉ thị + nguyên tắc cho agent)" text={String(d.systemPrompt)} />
      )}
    </div>
  )
}

/** Vòng gọi công cụ: lời dẫn của LLM + từng tool gọi (tham số + observation). */
function AgentToolDetail({ d }: { d: Record<string, unknown> }) {
  const calls =
    (d.calls as {
      name: string
      arguments: Record<string, unknown>
      observation: string
      cards: number
      suggestion: boolean
      docSearch?: DocSearchDetail
    }[]) ?? []
  return (
    <div className="text-[12px] text-on-surface-variant space-y-2">
      <KV k="Vòng" v={String(d.round)} />
      {d.thought != null && String(d.thought) && (
        <p className="italic text-on-surface-variant">💭 {String(d.thought)}</p>
      )}
      <div className="space-y-2">
        {calls.map((c, i) => (
          <div key={i} className="rounded-lg bg-surface-container px-2.5 py-2 space-y-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
              <Icon name="bolt" size={13} /> {c.name}
            </span>
            <p className="text-[11px] font-mono break-words">
              args: {JSON.stringify(c.arguments)}
            </p>
            <div className="flex flex-wrap gap-1">
              {c.cards > 0 && <KV k="Thẻ DB" v={String(c.cards)} />}
              {c.suggestion && <KV k="Lộ trình" v="đã dựng" />}
            </div>
            {/* search_documents → hiện rõ embedding + hybrid ranking + rerank */}
            {c.docSearch && <DocSearchDetailView d={c.docSearch} />}
            <RawBox label="Kết quả công cụ (observation nhồi lại cho LLM)" text={c.observation} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Chi tiết pipeline search_documents: embedding + cosine + BM25 → RRF + rerank. */
function DocSearchDetailView({ d }: { d: DocSearchDetail }) {
  const rerankLabel =
    d.rerankVia === 'cross-encoder'
      ? 'Cross-Encoder'
      : d.rerankVia === 'llm'
        ? 'LLM chấm 0–10'
        : d.rerankVia === 'disabled'
          ? 'tắt (giữ RRF)'
          : 'fallback (RRF)'
  return (
    <details className="mt-1 rounded-lg border border-primary/25 bg-primary/5 overflow-hidden" open>
      <summary className="cursor-pointer select-none px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 flex items-center gap-1.5">
        <Icon name="travel_explore" size={13} />
        Tra cứu vector: embedding → cosine + BM25 → RRF → rerank
      </summary>
      <div className="px-2.5 py-2 space-y-2">
        <div className="flex flex-wrap gap-1">
          <KV k="Embedding" v={d.embedModel} />
          <KV k="Số chiều" v={String(d.dimensions)} />
          <KV k="Kho chunk" v={String(d.totalChunks)} />
          <KV k="Ứng viên" v={String(d.candidateK)} />
          <KV k="Rerank" v={rerankLabel} />
          {d.rerankModel && <KV k="Model rerank" v={d.rerankModel} />}
        </div>
        <p className="text-[10px] text-on-surface-variant leading-relaxed">
          Mỗi ứng viên chấm 2 điểm độc lập: <b>cosine</b> (vector ngữ nghĩa) + <b>BM25</b> (từ khoá),
          hợp nhất bằng <b>RRF</b>, rồi <b>rerank</b> (cross-encoder chấm cặp câu hỏi–đoạn) lọc top-K.
          Hàng <span className="text-primary font-bold">xanh</span> = được giữ.
        </p>
        <div className="space-y-1">
          {d.candidates.map((c, i) => (
            <div
              key={i}
              className={cn(
                'rounded-md px-2 py-1.5 text-[10px]',
                c.kept ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-surface-container-lowest opacity-70',
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-primary">#{i + 1}</span>
                <span className="font-bold truncate">
                  {c.docName} <span className="text-on-surface-variant">· chunk {c.chunkIndex}</span>
                </span>
                <span className="ml-auto font-bold">
                  {c.kept ? (
                    <span className="text-primary">✓ giữ</span>
                  ) : (
                    <span className="text-on-surface-variant">loại</span>
                  )}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1 font-mono">
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  cosine {c.dense.toFixed(3)}
                  {c.denseRank != null ? ` ·#${c.denseRank}` : ''}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-tertiary/15 text-tertiary">
                  BM25 {c.sparse.toFixed(2)}
                  {c.sparseRank != null ? ` ·#${c.sparseRank}` : ''}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-high">
                  RRF {c.rrf.toFixed(4)}
                </span>
                {c.relevance != null && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 font-bold">
                    rerank {c.relevance}/10
                  </span>
                )}
              </div>
              <p className="mt-1 text-on-surface-variant line-clamp-1">{c.preview}…</p>
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}

/** Bước chốt: model + số vòng đã chạy + số thẻ gom được → hiện sau lọc. */
function AgentFinalDetail({ d }: { d: Record<string, unknown> }) {
  const collected = Number(d.cardsCollected ?? 0)
  const shown = d.cardsShown != null ? Number(d.cardsShown) : null
  return (
    <div className="text-[12px] text-on-surface-variant space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <KV k="Model" v={String(d.model)} />
        <KV k="Số vòng đã chạy" v={String(d.rounds)} />
        {/* Gom được → hiện ra: minh hoạ bước LỌC thẻ theo câu trả lời (bỏ thẻ thừa). */}
        <KV
          k="Thẻ"
          v={shown != null ? `gom ${collected} → hiện ${shown}` : `gom ${collected}`}
        />
        <KV k="Lộ trình" v={d.itineraryBuilt ? 'có' : 'không'} />
        <KV k="Độ dài trả lời" v={`${d.answerChars} ký tự`} />
      </div>
      {shown != null && shown < collected && (
        <p className="text-[11px] text-tertiary bg-tertiary/10 rounded-lg px-2 py-1">
          Đã lọc bỏ {collected - shown} thẻ không được câu trả lời nhắc tới (chống hiện thẻ thừa).
        </p>
      )}
    </div>
  )
}

/** Hộp hiển thị văn bản nguyên văn (có thể đóng/mở) để soi dữ liệu thật gửi đi. */
function RawBox({ label, text }: { label: string; text: string }) {
  return (
    <details className="mt-1 rounded-lg border border-outline-variant/30 bg-surface-container-lowest overflow-hidden">
      <summary className="cursor-pointer select-none px-2.5 py-1.5 text-[11px] font-bold text-on-surface hover:bg-surface-container flex items-center gap-1.5">
        <Icon name="data_object" size={13} className="text-primary" />
        {label}
      </summary>
      <pre className="px-2.5 py-2 text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono text-on-surface-variant max-h-72 overflow-y-auto">
        {text}
      </pre>
    </details>
  )
}

interface VectorResult {
  docName: string
  chunkIndex: number
  score: number
  preview: string
  content: string
  denseScore?: number
  sparseScore?: number
  denseRank?: number | null
  sparseRank?: number | null
  reason?: string
}

function ChunkBar({
  rank,
  result,
  scoreLabel = 'Điểm',
  scoreMax = 1,
}: {
  rank: number
  result: VectorResult
  scoreLabel?: string
  scoreMax?: number
}) {
  const pct = Math.max(0, Math.min(100, Math.round((result.score / scoreMax) * 100)))
  const hasParts = result.denseScore != null || result.sparseScore != null
  return (
    <div className="rounded-xl bg-surface-container px-2.5 py-2">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="font-bold text-primary">#{rank}</span>
        <span className="font-bold">
          {result.docName} <span className="text-on-surface-variant">· chunk {result.chunkIndex}</span>
        </span>
        <span className="ml-auto font-mono font-bold">
          {scoreLabel} {result.score.toFixed(scoreMax === 1 ? 4 : 2)}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
        <div className="h-full editorial-gradient" style={{ width: `${pct}%` }} />
      </div>
      {hasParts && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {result.denseScore != null && (
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
              vector {result.denseScore.toFixed(3)}
              {result.denseRank != null ? ` · #${result.denseRank}` : ''}
            </span>
          )}
          {result.sparseScore != null && (
            <span className="px-1.5 py-0.5 rounded bg-tertiary/15 text-tertiary text-[10px] font-bold">
              BM25 {result.sparseScore.toFixed(2)}
              {result.sparseRank != null ? ` · #${result.sparseRank}` : ''}
            </span>
          )}
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-on-surface-variant line-clamp-2">{result.preview}…</p>
      {result.reason && (
        <p className="mt-1 text-[11px] text-tertiary italic">↳ {result.reason}</p>
      )}
    </div>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-[11px]">
      <span className="font-bold">{k}:</span> {v}
    </span>
  )
}
