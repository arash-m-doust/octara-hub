import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useMessageStore } from '@/stores/messageStore'
import { useUIStore } from '@/stores/uiStore'
import { realtime } from '@/realtime/connection'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import type { Message } from '@/api/messages'

export function ChatView() {
  const { t } = useTranslation()
  const { currentChannel } = useWorkspaceStore()
  const { fetchMessages, addMessage, clear } = useMessageStore()
  const { toggleRightPanel } = useUIStore()

  useEffect(() => {
    if (!currentChannel) return
    fetchMessages(currentChannel.id)

    const unsub = realtime.on('message.created', (data: unknown) => {
      const { message } = data as { message: Message }
      if (message.channel === currentChannel.id) {
        addMessage(message)
      }
    })

    return () => {
      unsub()
      clear()
    }
  }, [currentChannel?.id, fetchMessages, addMessage, clear])

  if (!currentChannel) return null

  return (
    <>
      {/* Channel Header */}
      <div className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-border-light bg-surface-raised">
        <div className="flex items-center gap-2">
          <span className="text-muted">#</span>
          <h3 className="font-semibold text-sm">{currentChannel.name}</h3>
          {currentChannel.description && (
            <span className="text-xs text-muted ms-2 hidden sm:inline">{currentChannel.description}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => toggleRightPanel('pinned')} className="p-1.5 rounded hover:bg-surface-inset text-muted" title={t('chat.pinned')}>📌</button>
          <button onClick={() => toggleRightPanel('members')} className="p-1.5 rounded hover:bg-surface-inset text-muted" title={t('workspace.members')}>👥</button>
          <button onClick={() => toggleRightPanel('files')} className="p-1.5 rounded hover:bg-surface-inset text-muted" title={t('files.browser')}>📁</button>
          <button onClick={() => toggleRightPanel('search')} className="p-1.5 rounded hover:bg-surface-inset text-muted" title={t('search.placeholder')}>🔍</button>
        </div>
      </div>

      {/* Messages */}
      <MessageList />

      {/* Input */}
      <MessageInput
        onSend={(content) => {
          const { sendMessage, replyTo } = useMessageStore.getState()
          sendMessage(currentChannel.id, content, replyTo?.id)
        }}
        placeholder={`${t('chat.typeMessage')} #${currentChannel.name}`}
      />
    </>
  )
}
