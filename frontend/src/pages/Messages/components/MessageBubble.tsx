import { Icon } from '@components/ui/Icon'
import { cn } from '@utils/cn'
import type { ChatMessage, MessageStatus } from '@types/message'

interface Props {
  message: ChatMessage
  fromMe: boolean
  /** Substring to highlight in the body (case-insensitive). */
  highlight?: string
  /** Delete this message (own messages only). */
  onDelete?: (messageId: string) => void
}

const statusIcon: Record<MessageStatus, string> = {
  sending: 'schedule',
  sent: 'check',
  delivered: 'done_all',
  read: 'done_all',
}

/** Wrap occurrences of `query` in <mark>. Case-insensitive. */
function highlightText(text: string, query?: string) {
  const q = query?.trim()
  if (!q) return text
  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const out: React.ReactNode[] = []
  let i = 0
  let key = 0
  while (i < text.length) {
    const idx = lower.indexOf(needle, i)
    if (idx === -1) {
      out.push(text.slice(i))
      break
    }
    if (idx > i) out.push(text.slice(i, idx))
    out.push(
      <mark
        key={key++}
        className="bg-amber-200 text-on-surface rounded px-0.5"
      >
        {text.slice(idx, idx + needle.length)}
      </mark>,
    )
    i = idx + needle.length
  }
  return out
}

export function MessageBubble({ message, fromMe, highlight, onDelete }: Props) {
  const hasAttachment = !!message.attachment
  const showTextBubble = message.content.trim().length > 0

  return (
    <div
      className={cn(
        'group/msg flex flex-col max-w-[78%] sm:max-w-[68%]',
        fromMe ? 'items-end' : 'items-start'
      )}
    >
      {hasAttachment && (
        <div
          className={cn(
            'rounded-2xl overflow-hidden shadow-editorial mb-1',
            fromMe ? 'rounded-br-md' : 'rounded-bl-md'
          )}
        >
          <img
            src={message.attachment}
            alt="attachment"
            className="block w-full max-h-72 object-cover"
          />
        </div>
      )}

      <div className={cn('flex items-center gap-1.5', fromMe ? 'flex-row' : 'flex-row-reverse')}>
        {/* Delete affordance — own messages only, revealed on hover. */}
        {fromMe && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(message.id)}
            aria-label="Xoá tin nhắn"
            title="Xoá tin nhắn"
            className="opacity-0 group-hover/msg:opacity-100 focus:opacity-100 transition w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 shrink-0"
          >
            <Icon name="delete" size={16} />
          </button>
        )}

        {showTextBubble && (
          <div
            className={cn(
              'px-4 py-2.5 text-sm leading-relaxed break-words',
              fromMe
                ? 'bg-primary text-on-primary rounded-2xl rounded-br-md'
                : 'bg-surface-container text-on-surface rounded-2xl rounded-bl-md'
            )}
          >
            {highlightText(message.content, highlight)}
          </div>
        )}
      </div>

      <div
        className={cn(
          'flex items-center gap-1 mt-1 text-[10px] uppercase tracking-wider',
          fromMe ? 'text-on-surface-variant/70' : 'text-on-surface-variant/60'
        )}
      >
        <span>{message.createdAt}</span>
        {fromMe && message.status && (
          <Icon
            name={statusIcon[message.status]}
            className={cn(
              'text-sm',
              message.status === 'read' ? 'text-primary' : 'text-on-surface-variant/60'
            )}
          />
        )}
      </div>
    </div>
  )
}
