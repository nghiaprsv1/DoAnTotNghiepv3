import { useEffect, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { LoadingState } from '@components/common/LoadingState'
import { ragV2Service, type RagStatus } from '@services/ragV2Service'
import { cn } from '@utils/cn'

/**
 * Admin — Kho tri thức RAG (chatbot v2). Cho phép admin xem trạng thái vector
 * store và nạp / re-index tài liệu trong documemtRAG/. Endpoint /rag-v2/ingest
 * chỉ admin gọi được (RolesGuard) — trang này là UI chính thức cho việc đó.
 */
export function AdminRagPage() {
  const [status, setStatus] = useState<RagStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [ingesting, setIngesting] = useState(false)
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setStatus(await ragV2Service.status())
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const runIngest = async (files?: string[]) => {
    if (ingesting) return
    setIngesting(true)
    setNotice(null)
    try {
      const res = await ragV2Service.ingest(files)
      setNotice({
        type: 'ok',
        text: `Đã nạp ${res.totalChunks} chunk từ ${res.documents.length} tài liệu (model: ${res.embeddingModel}).`,
      })
      await load()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Nạp tài liệu thất bại. Kiểm tra khoá LLM và thử lại.'
      setNotice({ type: 'err', text: msg })
    } finally {
      setIngesting(false)
    }
  }

  const ingestedNames = new Set((status?.documents ?? []).map((d) => d.docName))
  const chunkOf = (name: string) =>
    status?.documents.find((d) => d.docName === name)?.chunks ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-headline font-extrabold text-on-surface flex items-center gap-2">
            <Icon name="dataset" className="text-primary" />
            Kho tri thức RAG
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Nạp và re-index tài liệu cho chatbot AI (RAG v2). Dữ liệu lấy từ thư mục{' '}
            <code className="text-primary">documemtRAG/</code> trên máy chủ.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void load()} disabled={loading || ingesting}>
            <Icon name="refresh" size={16} /> Làm mới
          </Button>
          <Button onClick={() => void runIngest()} disabled={ingesting}>
            <Icon name={ingesting ? 'hourglass_empty' : 'cloud_sync'} size={16} />
            {ingesting ? 'Đang nạp…' : 'Nạp toàn bộ'}
          </Button>
        </div>
      </div>

      {notice && (
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            notice.type === 'ok'
              ? 'bg-green-500/10 text-green-700'
              : 'bg-error/10 text-error',
          )}
        >
          {notice.text}
        </div>
      )}

      {loading ? (
        <LoadingState count={2} />
      ) : !status ? (
        <div className="rounded-2xl bg-error/10 text-error px-4 py-3 text-sm">
          Không lấy được trạng thái RAG. Kiểm tra backend.
        </div>
      ) : (
        <>
          {/* Thẻ trạng thái tổng quan */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="dataset" label="Tổng chunk" value={String(status.totalChunks)} />
            <StatCard
              icon="description"
              label="Tài liệu đã nạp"
              value={`${status.documents.length}/${status.availableFiles.length}`}
            />
            <StatCard icon="hub" label="Provider" value={status.provider ?? '—'} />
            <StatCard
              icon={status.ready ? 'check_circle' : 'error'}
              label="Trạng thái"
              value={status.ready ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
              tone={status.ready ? 'ok' : 'warn'}
            />
          </div>

          <div className="text-xs text-on-surface-variant flex flex-wrap gap-x-5 gap-y-1">
            <span>Embedding: <b className="text-on-surface">{status.embeddingModel}</b></span>
            <span>Chat: <b className="text-on-surface">{status.chatModel}</b></span>
          </div>

          {/* Bảng file tài liệu */}
          <div className="bg-surface-container-lowest rounded-3xl shadow-editorial overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/15">
              <h2 className="font-headline font-bold text-on-surface">Tài liệu trong kho</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                File có trên máy chủ. Nạp riêng từng file hoặc dùng "Nạp toàn bộ" ở trên.
              </p>
            </div>
            {status.availableFiles.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-on-surface-variant">
                Không tìm thấy tài liệu nào trong <code>documemtRAG/</code>.
              </div>
            ) : (
              <ul className="divide-y divide-outline-variant/10">
                {status.availableFiles.map((name) => {
                  const done = ingestedNames.has(name)
                  return (
                    <li key={name} className="flex items-center gap-3 px-5 py-3">
                      <Icon
                        name={done ? 'check_circle' : 'radio_button_unchecked'}
                        size={18}
                        className={done ? 'text-green-600' : 'text-on-surface-variant'}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-on-surface truncate">{name}</p>
                        <p className="text-xs text-on-surface-variant">
                          {done ? `${chunkOf(name)} chunk` : 'Chưa nạp'}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void runIngest([name])}
                        disabled={ingesting}
                      >
                        <Icon name="cloud_sync" size={14} /> {done ? 'Nạp lại' : 'Nạp'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Tài liệu đã nạp nhưng không còn file nguồn (mồ côi) */}
          {status.documents.filter((d) => !status.availableFiles.includes(d.docName)).length > 0 && (
            <div className="bg-amber-500/10 rounded-2xl px-4 py-3 text-sm text-amber-800">
              <b>Lưu ý:</b> có tài liệu đã nạp nhưng file nguồn không còn trong{' '}
              <code>documemtRAG/</code> (chunk mồ côi):{' '}
              {status.documents
                .filter((d) => !status.availableFiles.includes(d.docName))
                .map((d) => `${d.docName} (${d.chunks})`)
                .join(', ')}
              . Chúng vẫn được chatbot dùng cho tới khi bị xoá thủ công.
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: string
  label: string
  value: string
  tone?: 'ok' | 'warn'
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-editorial p-4">
      <Icon
        name={icon}
        size={20}
        className={cn(
          tone === 'ok' ? 'text-green-600' : tone === 'warn' ? 'text-amber-600' : 'text-primary',
        )}
      />
      <p className="text-xl font-headline font-extrabold text-on-surface mt-1.5">{value}</p>
      <p className="text-xs text-on-surface-variant">{label}</p>
    </div>
  )
}
