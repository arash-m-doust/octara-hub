import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDMStore } from '@/stores/dmStore'
import { useAuthStore } from '@/stores/authStore'
import { realtime } from '@/realtime/connection'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { MessageInput } from '@/components/chat/MessageInput'
import type { Message } from '@/api/messages'
import { CallButton } from '@/components/call/CallButton'

export function DMChatView() {
  const { t } = useTranslation()
  const { currentThread, messages, isLoading, fetchMessages, sendMessage, addMessage } = useDMStore()
  const { user } = useAuthStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentThread) return
    fetchMessages(currentThread.id)

    const unsub = realtime.on('message.created', (data: unknown) => {
      const { message } = data as { message: Message }
      if (message.dm_thread === currentThread.id) {
        addMessage(message)
      }
    })

    return () => unsub()
  }, [currentThread?.id, fetchMessages, addMessage])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!currentThread) return null

  const otherParticipants = currentThread.participants.filter((p) => p.user.id !== user?.id)
  const displayName = currentThread.is_group
    ? currentThread.name || otherParticipants.map((p) => p.user.profile?.display_name || p.user.username).join(', ')
    : otherParticipants[0]?.user.profile?.display_name || otherParticipants[0]?.user.username || 'Unknown'

  return (
    <>
      {/* DM Header */}
      <div
        className="h-11 flex-shrink-0 flex items-center px-4 border-b"
        style={{
          background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface-plate) 100%)',
          borderColor: 'var(--color-border-groove)',
          boxShadow: 'inset 0 1px 0 var(--color-metal-highlight)',
        }}
      >
        <div className="flex items-center flex-1">
          <span className="ind-led ind-led-on mr-2" style={{ backgroundColor: 'var(--color-accent)', width: '6px', height: '6px' }} />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{displayName}</h3>
        </div>
        <CallButton dmThreadId={currentThread.id} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted">{t('common.loading')}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted">{t('chat.noMessages')}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={(content) => sendMessage(currentThread.id, content)}
        placeholder={`Message ${displayName}`}
      />
    </>
  )
}
