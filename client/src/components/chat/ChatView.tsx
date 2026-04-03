import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useMessageStore } from '@/stores/messageStore'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { realtime } from '@/realtime/connection'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { PinnedBanner } from './PinnedBanner'
import type { Message } from '@/api/messages'
import { Pin, Users, FolderOpen, Search } from 'lucide-react'
import { CallButton } from '@/components/call/CallButton'

export function ChatView() {
  const { t } = useTranslation()
  const { currentChannel } = useWorkspaceStore()
  const { fetchMessages, addMessage, fetchPinnedMessages, clear } = useMessageStore()
  const { toggleRightPanel } = useUIStore()
  const { user: currentUser } = useAuthStore()
  const [typingUsers, setTypingUsers] = useState<{ userId: number; username: string; expiresAt: number }[]>([])

  useEffect(() => {
    if (!currentChannel) return
    fetchMessages(currentChannel.id)
    fetchPinnedMessages(currentChannel.id)

    const unsubs = [
      realtime.on('message.created', (data: unknown) => {
        const { message } = data as { message: Message }
        if (message.channel === currentChannel.id) {
          addMessage(message)
        }
      }),
      realtime.on('message.pinned', () => {
        if (currentChannel) fetchPinnedMessages(currentChannel.id)
      }),
      realtime.on('message.unpinned', () => {
        if (currentChannel) fetchPinnedMessages(currentChannel.id)
      }),
      realtime.on('typing.start', (data: unknown) => {
        const { user_id, username } = data as { user_id: number; username: string }
        if (user_id === currentUser?.id) return
        setTypingUsers((prev) => {
          const filtered = prev.filter((u) => u.userId !== user_id)
          return [...filtered, { userId: user_id, username, expiresAt: Date.now() + 3000 }]
        })
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.expiresAt > Date.now()))
        }, 3100)
      }),
    ]

    return () => {
      unsubs.forEach((u) => u())
      clear()
      setTypingUsers([])
    }
  }, [currentChannel?.id, fetchMessages, fetchPinnedMessages, addMessage, clear, currentUser?.id])

  if (!currentChannel) return null

  return (
    <>
      {/* Channel Header — metallic strip */}
      <div
        className="h-11 flex-shrink-0 flex items-center justify-between px-4 border-b"
        style={{
          background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface-plate) 100%)',
          borderColor: 'var(--color-border-groove)',
          boxShadow: 'inset 0 1px 0 var(--color-metal-highlight)',
        }}
      >
        <div className="flex items-center gap-2">
          {/* LED for channel */}
          <span
            className="ind-led ind-led-on"
            style={{ backgroundColor: 'var(--color-accent)', width: '6px', height: '6px' }}
          />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{currentChannel.name}</h3>
          {currentChannel.description && (
            <span className="text-xs ms-2 hidden sm:inline" style={{ color: 'var(--color-text-muted)' }}>{currentChannel.description}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <CallButton channelId={currentChannel.id} />
          <button onClick={() => toggleRightPanel('pinned')} className="w-7 h-7 flex items-center justify-center rounded-ind ind-button p-0 text-muted" title={t('chat.pinned')} aria-label="View pinned messages">
            <Pin size={14} />
          </button>
          <button onClick={() => toggleRightPanel('members')} className="w-7 h-7 flex items-center justify-center rounded-ind ind-button p-0 text-muted" title={t('workspace.members')} aria-label="View members">
            <Users size={14} />
          </button>
          <button onClick={() => toggleRightPanel('files')} className="w-7 h-7 flex items-center justify-center rounded-ind ind-button p-0 text-muted" title={t('files.browser')} aria-label="Browse files">
            <FolderOpen size={14} />
          </button>
          <button onClick={() => toggleRightPanel('search')} className="w-7 h-7 flex items-center justify-center rounded-ind ind-button p-0 text-muted" title="Search (Cmd/Ctrl+K)" aria-label="Search messages">
            <Search size={14} />
          </button>
        </div>
      </div>

      {/* Pinned message banner */}
      <PinnedBanner />

      {/* Messages */}
      <MessageList />

      {typingUsers.length > 0 && (
        <div className="px-4 pb-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span className="animate-pulse">...</span>{' '}
          {typingUsers.map((u) => u.username).join(', ')}{' '}
          {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Input */}
      <MessageInput
        onSend={(content) => {
          const { sendMessage, replyTo } = useMessageStore.getState()
          sendMessage(currentChannel.id, content, replyTo?.id)
        }}
        placeholder={`${t('chat.typeMessage')} #${currentChannel.name}`}
        uploadTarget={{ type: 'channel', id: currentChannel.id }}
      />
    </>
  )
}

