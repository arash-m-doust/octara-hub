import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'
import { useMessageStore } from '@/stores/messageStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Avatar } from '@/components/ui/Avatar'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import type { Message } from '@/api/messages'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { setReplyTo, editMessage, deleteMessage, addReaction } = useMessageStore()
  const { currentChannel } = useWorkspaceStore()
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const isOwn = user?.id === message.user.id

  const handleEdit = async () => {
    if (!currentChannel || editContent.trim() === message.content) {
      setEditing(false)
      return
    }
    await editMessage(currentChannel.id, message.id, editContent.trim())
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!currentChannel) return
    await deleteMessage(currentChannel.id, message.id)
  }

  const menuItems = [
    { label: t('chat.reply'), icon: '↩', onClick: () => setReplyTo(message) },
    { label: t('chat.pin'), icon: '📌', onClick: () => {} },
    ...(isOwn
      ? [
          { label: t('chat.edit'), icon: '✏', onClick: () => { setEditing(true); setEditContent(message.content) } },
          { label: t('chat.delete'), icon: '🗑', onClick: handleDelete, danger: true },
        ]
      : []),
  ]

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢']

  return (
    <div className="group flex gap-3 py-1.5 px-2 rounded-skeu hover:bg-surface-raised/50 transition-colors">
      <Avatar
        name={message.user.profile?.display_name || message.user.username}
        size="sm"
        src={message.user.profile?.avatar_path || undefined}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-800">
            {message.user.profile?.display_name || message.user.username}
          </span>
          <span className="text-[10px] text-muted">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {message.is_edited && (
            <span className="text-[10px] text-muted">{t('chat.edited')}</span>
          )}
        </div>

        {/* Reply preview */}
        {message.reply_to_preview && (
          <div className="mt-0.5 ps-3 border-s-2 border-accent/30 text-xs text-muted">
            <span className="font-medium text-accent">
              {message.reply_to_preview.user.profile?.display_name || message.reply_to_preview.user.username}
            </span>
            {': '}
            {message.reply_to_preview.content}
          </div>
        )}

        {/* Content */}
        {editing ? (
          <div className="mt-1">
            <input
              className="skeu-input text-sm"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEdit()
                if (e.key === 'Escape') setEditing(false)
              }}
              autoFocus
            />
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mt-0.5">
            {message.content}
          </p>
        )}

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => {
                  if (!currentChannel) return
                  if (r.reacted) {
                    // Would need removeReaction
                  } else {
                    addReaction(currentChannel.id, message.id, r.emoji)
                  }
                }}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                  r.reacted
                    ? 'bg-accent-soft border-accent/30 text-accent'
                    : 'bg-surface-raised border-border-light text-muted hover:bg-surface-inset'
                }`}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions (visible on hover) */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-0.5 pt-1">
        {quickReactions.slice(0, 3).map((emoji) => (
          <button
            key={emoji}
            onClick={() => currentChannel && addReaction(currentChannel.id, message.id, emoji)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-inset text-xs"
          >
            {emoji}
          </button>
        ))}
        <DropdownMenu
          trigger={
            <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-inset text-xs text-muted">
              ⋯
            </button>
          }
          items={menuItems}
        />
      </div>
    </div>
  )
}
