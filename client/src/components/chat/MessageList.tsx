import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMessageStore } from '@/stores/messageStore'
import { MessageBubble } from './MessageBubble'

export function MessageList() {
  const { t } = useTranslation()
  const { messages, isLoading } = useMessageStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm text-muted">{t('common.loading')}</span>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted">{t('chat.noMessages')}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
