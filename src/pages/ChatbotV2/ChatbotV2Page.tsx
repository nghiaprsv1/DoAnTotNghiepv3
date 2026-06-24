import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { ROUTES } from '@constants/routes'
import { cn } from '@utils/cn'
import {
  ragV2Service,
  type RagAskResult,
  type RagStatus,
  type RagStep,
} from '@services/ragV2Service'

interface ChatItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  trace?: RagAskResult['trace']
  pending?: boolean
  error?: boolean
}

const SAMPLE_QUESTIONS = [
  'Làm sao để xác thực email khi đăng ký?',
  'Tôi cần lưu ý gì khi đi du lịch vùng núi?',
  'Cách tạo một chuyến đi mới trên TripMate?',
  'Nạp tiền vào ví bằng cách nào?',
  'Mùa nào đẹp nhất để đi thác Bản Giốc?',
]

/**
 * Trang chatbot RAG v2 (thử nghiệm) — ĐỘC LẬP với website hiện tại.
 * Hiển thị RÕ phương pháp thực thi RAG: chunking → embedding → vector search
 * (cosine) → ghép ngữ cảnh → sinh câu trả lời, kèm điểm similarity & thời gian.
 */
export function ChatbotV2Page() {
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
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: pendingId, role: 'assistant', content: '', pending: true },
    ])

    try {
      const res = await ragV2Service.ask(content)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? { ...m, content: res.answer, trace: res.trace, pending: false }
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
              Retrieval-Augmented Generation · chunking + embedding + vector database
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
                placeholder="Hỏi về cách dùng web hoặc lưu ý du lịch…"
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

/* ─────────────────────── Status bar ─────────────────────── */

function StatusBar({
  status,
  ingesting,
  onIngest,
  notice,
}: {
  status: RagStatus | null
  ingesting: boolean
  onIngest: () => void
  notice: string | null
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

const PIPELINE_STAGES = [
  { icon: 'description', title: 'Tài liệu', sub: 'documemtRAG/*.txt' },
  { icon: 'content_cut', title: 'Chunking', sub: 'tách đoạn + overlap' },
  { icon: 'scatter_plot', title: 'Embedding', sub: 'Gemini → vector' },
  { icon: 'database', title: 'Vector DB', sub: 'Postgres (jsonb)' },
  { icon: 'search', title: 'Truy hồi', sub: 'cosine top-K' },
  { icon: 'auto_awesome', title: 'Sinh trả lời', sub: 'Gemini + ngữ cảnh' },
]

function PipelineLegend() {
  return (
    <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/20 p-4">
      <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">
        Phương pháp thực thi (RAG pipeline)
      </p>
      <div className="flex flex-wrap items-stretch gap-2">
        {PIPELINE_STAGES.map((s, i) => (
          <div key={s.title} className="flex items-center gap-2">
            <div className="flex flex-col items-center text-center w-24 rounded-2xl bg-surface-container-low px-2 py-2.5">
              <Icon name={s.icon} className="text-primary" size={20} />
              <span className="text-[12px] font-bold mt-1 leading-tight">{s.title}</span>
              <span className="text-[10px] text-on-surface-variant leading-tight">{s.sub}</span>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <Icon name="arrow_forward" size={16} className="text-outline" />
            )}
          </div>
        ))}
      </div>
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
      <p className="font-headline font-extrabold text-lg">Hỏi đáp dựa trên tài liệu</p>
      <p className="text-[13px] text-on-surface-variant max-w-md mx-auto mt-1">
        Mỗi câu trả lời sẽ kèm bảng chi tiết các bước RAG: vector hoá câu hỏi, tìm kiếm
        tương đồng, ngữ cảnh và sinh câu trả lời.
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
          'max-w-[88%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
          fromUser
            ? 'bg-primary text-on-primary rounded-br-sm'
            : item.error
              ? 'bg-error/10 text-error rounded-bl-sm'
              : 'bg-surface-container text-on-surface rounded-bl-sm',
        )}
      >
        {item.pending ? <TypingDots /> : item.content}
      </div>
      {item.trace && <TracePanel trace={item.trace} />}
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
  if (step.key === 'embed_query') {
    const preview = (d.preview as number[]) ?? []
    return (
      <div className="text-[12px] text-on-surface-variant space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          <KV k="Model" v={String(d.model)} />
          <KV k="Số chiều" v={String(d.dimensions)} />
        </div>
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

  if (step.key === 'vector_search') {
    const results = (d.results as VectorResult[]) ?? []
    return (
      <div className="text-[12px] text-on-surface-variant space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <KV k="Phương pháp" v={String(d.method)} />
          <KV k="Ứng viên" v={String(d.candidates)} />
          <KV k="Top-K" v={String(d.topK)} />
        </div>
        <div className="space-y-1.5">
          {results.map((r, i) => (
            <ChunkBar key={i} rank={i + 1} result={r} />
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
}

function ChunkBar({ rank, result }: { rank: number; result: VectorResult }) {
  const pct = Math.max(0, Math.min(100, Math.round(result.score * 100)))
  return (
    <div className="rounded-xl bg-surface-container px-2.5 py-2">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="font-bold text-primary">#{rank}</span>
        <span className="font-bold">
          {result.docName} <span className="text-on-surface-variant">· chunk {result.chunkIndex}</span>
        </span>
        <span className="ml-auto font-mono font-bold">{result.score.toFixed(4)}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
        <div className="h-full editorial-gradient" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-on-surface-variant line-clamp-2">{result.preview}…</p>
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
