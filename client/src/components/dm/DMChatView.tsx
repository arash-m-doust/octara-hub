import { useEffect, useRef, useState } from 'react'
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
  const { currentThread, messages, isLoading, fetchMessages, sendMessage, addMessage, markThreadRead } = useDMStore()
  const { user } = useAuthStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const readDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [typingUsers, setTypingUsers] = useState<{ userId: number; username: string; expiresAt: number }[]>([])

  const scheduleMarkRead = () => {
    if (!currentThread) return
    if (readDebounceRef.current) clearTimeout(readDebounceRef.current)
    readDebounceRef.current = setTimeout(() => {
      void markThreadRead(currentThread.id)
      readDebounceRef.current = null
    }, 250)
  }

  useEffect(() => {
    if (!currentThread) return
    fetchMessages(currentThread.id)

    const unsub = realtime.on('message.created', (data: unknown) => {
      const { message } = data as { message: Message }
      if (message.dm_thread === currentThread.id) {
        addMessage(message)
        scheduleMarkRead()
      }
    })
    const unsubTyping = realtime.on('dm.typing.start', (data: unknown) => {
      const { thread_id, user_id, username } = data as { thread_id: number; user_id: number; username: string }
      if (thread_id !== currentThread.id || user_id === user?.id) return
      setTypingUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== user_id)
        return [...filtered, { userId: user_id, username, expiresAt: Date.now() + 3000 }]
      })
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.expiresAt > Date.now()))
      }, 3100)
    })

    return () => {
      unsub()
      unsubTyping()
      if (readDebounceRef.current) {
        clearTimeout(readDebounceRef.current)
        readDebounceRef.current = null
      }
      setTypingUsers([])
    }
  }, [currentThread?.id, fetchMessages, addMessage, user?.id, markThreadRead])

  useEffect(() => {
    if (!currentThread) return
    scheduleMarkRead()
  }, [currentThread?.id, messages.length])

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
          <span className="ind-led ind-led-on me-2" style={{ backgroundColor: 'var(--color-accent)', width: '6px', height: '6px' }} />
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
            <div key={msg.id} data-message-id={msg.id}>
              <MessageBubble message={msg} />
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {typingUsers.length > 0 && (
        <div className="px-4 pb-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span className="animate-pulse">...</span>{' '}
          {typingUsers.map((u) => u.username).join(', ')}{' '}
          {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      <MessageInput
        onSend={(content) => sendMessage(currentThread.id, content)}
        placeholder={`Message ${displayName}`}
        uploadTarget={{ type: 'dm', id: currentThread.id }}
      />
    </>
  )
}

