import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'
import { useMessageStore } from '@/stores/messageStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Avatar } from '@/components/ui/Avatar'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import type { Message, MessageAttachment } from '@/api/messages'

interface MessageBubbleProps {
  message: Message
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileAttachment({ attachment }: { attachment: MessageAttachment }) {
  const isImage = attachment.mime_type.startsWith('image/')
  const isVideo = attachment.mime_type.startsWith('video/')
  const isAudio = attachment.mime_type.startsWith('audio/')
  const [imgError, setImgError] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const downloadUrl = `/api${attachment.download_url}`
  const previewUrl = attachment.preview_url ? `/api${attachment.preview_url}` : null

  if (isImage && previewUrl && !imgError) {
    return (
      <div className="mt-1.5">
        <img
          src={previewUrl}
          alt={attachment.original_filename}
          className="max-w-xs max-h-64 rounded-skeu border border-border-light cursor-pointer hover:opacity-90 transition-opacity"
          onError={() => setImgError(true)}
          onClick={() => setExpanded(!expanded)}
        />
        {expanded && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 cursor-pointer"
            onClick={() => setExpanded(false)}
          >
            <img
              src={previewUrl}
              alt={attachment.original_filename}
              className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-lg"
            />
          </div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted">{attachment.original_filename}</span>
          <span className="text-[10px] text-muted">({formatFileSize(attachment.file_size)})</span>
          <a
            href={downloadUrl}
            download={attachment.original_filename}
            className="text-[10px] text-accent hover:underline"
          >
            Download
          </a>
        </div>
      </div>
    )
  }

  if (isVideo) {
    return (
      <div className="mt-1.5">
        <video
          src={downloadUrl}
          controls
          className="max-w-xs max-h-48 rounded-skeu border border-border-light"
        />
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted">{attachment.original_filename}</span>
          <a href={downloadUrl} download className="text-[10px] text-accent hover:underline">Download</a>
        </div>
      </div>
    )
  }

  if (isAudio) {
    return (
      <div className="mt-1.5">
        <audio src={downloadUrl} controls className="max-w-xs" />
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted">{attachment.original_filename}</span>
          <a href={downloadUrl} download className="text-[10px] text-accent hover:underline">Download</a>
        </div>
      </div>
    )
  }

  // Generic file
  return (
    <div className="mt-1.5 flex items-center gap-2 p-2 rounded-skeu bg-surface-inset border border-border-light max-w-xs">
      <span className="text-lg">📄</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{attachment.original_filename}</div>
        <div className="text-[10px] text-muted">{formatFileSize(attachment.file_size)}</div>
      </div>
      <a
        href={downloadUrl}
        download={attachment.original_filename}
        className="text-xs text-accent hover:underline flex-shrink-0"
      >
        ⬇
      </a>
    </div>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { setReplyTo, editMessage, deleteMessage, addReaction } = useMessageStore()
  const { currentChannel } = useWorkspaceStore()
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const isOwn = user?.id === message.user.id
  const hasAttachments = message.attachments && message.attachments.length > 0
  // If message content is just the auto-generated "📎 filename" and there are attachments, hide the text
  const isAutoContent = hasAttachments && message.content.startsWith('📎 ')

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
    ...(isOwn || user?.is_superuser
      ? [
          ...(isOwn ? [{ label: t('chat.edit'), icon: '✏', onClick: () => { setEditing(true); setEditContent(message.content) } }] : []),
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
          <>
            {/* Only show text content if it's not auto-generated file text */}
            {!isAutoContent && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mt-0.5">
                {message.content}
              </p>
            )}
          </>
        )}

        {/* Attachments */}
        {hasAttachments && message.attachments.map((att) => (
          <FileAttachment key={att.id} attachment={att} />
        ))}

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
