import { Icon } from '@components/ui/Icon'
import { cn } from '@utils/cn'
import type { ChatMessage, MessageStatus } from '@types/message'

interface Props {
  message: ChatMessage
  fromMe: boolean
}

const statusIcon: Record<MessageStatus, string> = {
  sending: 'schedule',
  sent: 'check',
  delivered: 'done_all',
  read: 'done_all',
}

export function MessageBubble({ message, fromMe }: Props) {
  const hasAttachment = !!message.attachment
  const showTextBubble = message.content.trim().length > 0

  return (
    <div
      className={cn(
        'flex flex-col max-w-[78%] sm:max-w-[68%]',
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

      {showTextBubble && (
        <div
          className={cn(
            'px-4 py-2.5 text-sm leading-relaxed break-words',
            fromMe
              ? 'bg-primary text-on-primary rounded-2xl rounded-br-md'
              : 'bg-surface-container text-on-surface rounded-2xl rounded-bl-md'
          )}
        >
          {message.content}
        </div>
      )}

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
