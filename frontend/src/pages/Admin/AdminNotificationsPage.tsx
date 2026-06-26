import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { ImageUpload } from '@components/common/ImageUpload'
import { useBroadcastNotification } from '@hooks/useAdmin'
import { cn } from '@utils/cn'

type Mode = 'all' | 'one'

export function AdminNotificationsPage() {
  const [mode, setMode] = useState<Mode>('all')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [receiverId, setReceiverId] = useState('')
  const [image, setImage] = useState('')
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const broadcast = useBroadcastNotification()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    if (!title.trim() || !content.trim()) {
      setFeedback({ kind: 'err', msg: 'Tiêu đề và nội dung là bắt buộc.' })
      return
    }
    if (mode === 'one' && !receiverId.trim()) {
      setFeedback({ kind: 'err', msg: 'Nhập user ID người nhận.' })
      return
    }
    try {
      const res = await broadcast.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        sendToAll: mode === 'all',
        receiverId: mode === 'one' ? receiverId.trim() : undefined,
        image: image.trim() || undefined,
      })
      setFeedback({
        kind: 'ok',
        msg: `Đã gửi thông báo đến ${res.delivered} người dùng.`,
      })
      setTitle('')
      setContent('')
      setReceiverId('')
      setImage('')
    } catch (err: any) {
      setFeedback({
        kind: 'err',
        msg: err?.response?.data?.message ?? 'Không thể gửi thông báo. Thử lại sau.',
      })
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <h1 className="font-headline font-extrabold text-3xl text-on-surface">Gửi thông báo</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Gửi thông báo hệ thống đến một người dùng cụ thể hoặc toàn bộ người dùng đang hoạt động.
        </p>
      </header>

      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <ModeBtn icon="campaign" label="Tất cả" active={mode === 'all'} onClick={() => setMode('all')} />
        <ModeBtn icon="person" label="Một user" active={mode === 'one'} onClick={() => setMode('one')} />
      </div>

      <form onSubmit={submit} className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5 md:p-6 space-y-4">
        {mode === 'one' && (
          <Field label="ID người nhận">
            <input
              type="text"
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              placeholder="UUID của user"
              className="w-full px-4 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary"
            />
          </Field>
        )}

        <Field label="Tiêu đề">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Bảo trì hệ thống ngày 30/05"
            maxLength={120}
            className="w-full px-4 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary"
          />
        </Field>

        <Field label="Nội dung">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Mô tả chi tiết thông báo, các bước cần làm…"
            rows={5}
            maxLength={2000}
            className="w-full px-4 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 outline-none focus:border-primary resize-y"
          />
          <p className="text-[10px] text-on-surface-variant mt-1">
            {content.length} / 2000 ký tự
          </p>
        </Field>

        <Field label="Ảnh kèm (tuỳ chọn)">
          <ImageUpload
            label=""
            value={image || null}
            onChange={(url) => setImage(url ?? '')}
            hint="Tải ảnh từ máy của bạn (banner, poster thông báo…)."
            aspect="aspect-[16/9]"
          />
        </Field>

        {feedback && (
          <p className={cn('text-sm', feedback.kind === 'ok' ? 'text-green-700' : 'text-error')}>
            {feedback.msg}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" rounded="full" disabled={broadcast.isPending}>
            <Icon name="send" size={16} />
            {broadcast.isPending ? 'Đang gửi…' : 'Gửi thông báo'}
          </Button>
          <p className="text-xs text-on-surface-variant">
            {mode === 'all'
              ? 'Sẽ gửi đến tất cả user chưa bị khoá.'
              : 'Sẽ chỉ gửi đến người dùng được chỉ định.'}
          </p>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="block text-on-surface-variant mb-1 font-headline font-bold">{label}</span>
      {children}
    </label>
  )
}

function ModeBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-headline font-bold transition border',
        active
          ? 'bg-primary text-on-primary border-primary shadow-editorial'
          : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:border-primary/40',
      )}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  )
}
