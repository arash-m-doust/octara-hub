import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useMessageStore } from '@/stores/messageStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { MessageBubble } from './MessageBubble'

export function MessageList() {
  const { t } = useTranslation()
  const { messages, isLoading, hasMore, loadMore } = useMessageStore()
  const { currentChannel } = useWorkspaceStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevScrollHeight = useRef<number>(0)
  const prevMessageCount = useRef(messages.length)

  const [isNearBottom, setIsNearBottom] = useState(true)
  const [newMessageCount, setNewMessageCount] = useState(0)

  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const nearBottom = scrollHeight - scrollTop - clientHeight < 120
    setIsNearBottom(nearBottom)
    if (nearBottom) {
      setNewMessageCount(0)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const historyLoad = prevScrollHeight.current > 0
    if (historyLoad) {
      const newScrollHeight = container.scrollHeight
      container.scrollTop = newScrollHeight - prevScrollHeight.current
      prevScrollHeight.current = 0
    }

    if (messages.length > prevMessageCount.current && !historyLoad) {
      const delta = messages.length - prevMessageCount.current
      if (!isNearBottom) {
        setNewMessageCount((count) => count + delta)
      } else {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }

    prevMessageCount.current = messages.length
  }, [messages.length, isNearBottom])

  useEffect(() => {
    const sentinel = topRef.current
    const container = containerRef.current
    if (!sentinel || !container || !currentChannel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          prevScrollHeight.current = container.scrollHeight
          void loadMore(currentChannel.id)
        }
      },
      {
        threshold: 0.1,
        root: container,
      },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [currentChannel?.id, hasMore, isLoading, loadMore])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setNewMessageCount(0)
  }

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('chat.noMessages')}</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Message history"
        aria-live="polite"
        aria-relevant="additions"
        className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5"
      >
        <div ref={topRef} />

        {isLoading && hasMore && (
          <div className="flex justify-center py-2">
            <Loader2 size={16} className="animate-spin text-muted" />
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} data-message-id={msg.id}>
            <MessageBubble message={msg} />
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {!isNearBottom && (
        <button
          onClick={scrollToBottom}
          style={{
            position: 'absolute',
            bottom: 16,
            insetInlineStart: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 20,
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-accent)',
            boxShadow: '0 2px 8px var(--color-metal-shadow), 0 0 8px var(--color-accent-glow)',
            color: 'var(--color-accent)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            zIndex: 10,
          }}
          aria-label="Scroll to latest messages"
        >
          <ChevronDown size={14} />
          {newMessageCount > 0
            ? `${newMessageCount} new message${newMessageCount > 1 ? 's' : ''}`
            : 'Jump to bottom'}
        </button>
      )}
    </div>
  )
}
