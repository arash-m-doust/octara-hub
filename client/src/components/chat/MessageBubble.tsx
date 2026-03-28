import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'
import { useMessageStore } from '@/stores/messageStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Avatar } from '@/components/ui/Avatar'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import type { Message, MessageAttachment } from '@/api/messages'
import {
  Download,
  File,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileSpreadsheet,
  FileCode,
  Archive,
  Reply,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  MoreHorizontal,
} from 'lucide-react'

interface MessageBubbleProps {
  message: Message
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIconInfo(mimeType: string) {
  if (mimeType.startsWith('image/')) return { icon: ImageIcon, color: 'var(--color-accent)' }
  if (mimeType.startsWith('video/')) return { icon: Film, color: '#9B8FBF' }
  if (mimeType.startsWith('audio/')) return { icon: Music, color: 'var(--color-led-idle)' }
  if (mimeType.includes('pdf')) return { icon: FileText, color: '#FF5252' }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return { icon: FileSpreadsheet, color: 'var(--color-led-online)' }
  }
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) {
    return { icon: Archive, color: 'var(--color-led-idle)' }
  }
  if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('javascript')) {
    return { icon: FileCode, color: 'var(--color-accent)' }
  }
  return { icon: File, color: 'var(--color-text-muted)' }
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
          className="max-w-xs max-h-64 rounded-ind cursor-pointer hover:opacity-90 transition-opacity"
          style={{ border: '1px solid var(--color-border)', boxShadow: 'inset 0 1px 2px var(--color-metal-shadow)' }}
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
              className="max-w-[90vw] max-h-[90vh] rounded-ind-lg"
              style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
            />
          </div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <ImageIcon size={11} className="text-muted" />
          <span className="text-[10px] text-muted">{attachment.original_filename}</span>
          <span className="text-[10px] text-muted">({formatFileSize(attachment.file_size)})</span>
          <a href={downloadUrl} download={attachment.original_filename} className="inline-flex items-center gap-0.5 text-[10px] hover:underline" style={{ color: 'var(--color-accent)' }}>
            <Download size={10} /> Download
          </a>
        </div>
      </div>
    )
  }

  if (isVideo) {
    return (
      <div className="mt-1.5">
        <video src={downloadUrl} controls className="max-w-xs max-h-48 rounded-ind" style={{ border: '1px solid var(--color-border)' }} />
        <div className="flex items-center gap-2 mt-1">
          <Film size={11} className="text-muted" />
          <span className="text-[10px] text-muted">{attachment.original_filename}</span>
          <a href={downloadUrl} download className="inline-flex items-center gap-0.5 text-[10px] hover:underline" style={{ color: 'var(--color-accent)' }}>
            <Download size={10} /> Download
          </a>
        </div>
      </div>
    )
  }

  if (isAudio) {
    return (
      <div className="mt-1.5">
        <audio src={downloadUrl} controls className="max-w-xs" />
        <div className="flex items-center gap-2 mt-1">
          <Music size={11} className="text-muted" />
          <span className="text-[10px] text-muted">{attachment.original_filename}</span>
          <a href={downloadUrl} download className="inline-flex items-center gap-0.5 text-[10px] hover:underline" style={{ color: 'var(--color-accent)' }}>
            <Download size={10} /> Download
          </a>
        </div>
      </div>
    )
  }

  const { icon: FileIcon, color } = getFileIconInfo(attachment.mime_type)
  return (
    <div className="mt-1.5 flex items-center gap-2.5 p-2.5 rounded-ind ind-recess max-w-xs">
      <div className="w-9 h-9 rounded-ind flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-surface-plate)' }}>
        <FileIcon size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
          {attachment.original_filename}
        </div>
        <div className="text-[10px] text-muted">{formatFileSize(attachment.file_size)}</div>
      </div>
      <a
        href={downloadUrl}
        download={attachment.original_filename}
        className="p-1 rounded-ind transition-colors flex-shrink-0"
        style={{ color: 'var(--color-accent)' }}
        title="Download"
      >
        <Download size={15} />
      </a>
    </div>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const {
    setReplyTo,
    editMessage,
    deleteMessage,
    addReaction,
    pinMessage,
    unpinMessage,
    pinnedMessages,
  } = useMessageStore()
  const { currentChannel } = useWorkspaceStore()

  const isPinned = pinnedMessages.some((p) => p.message.id === message.id)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const isOwn = user?.id === message.user.id
  const hasAttachments = message.attachments && message.attachments.length > 0
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
    { label: t('chat.reply'), icon: <Reply size={12} />, onClick: () => setReplyTo(message) },
    {
      label: isPinned ? t('chat.unpin') : t('chat.pin'),
      icon: isPinned ? <PinOff size={12} /> : <Pin size={12} />,
      onClick: () => {
        if (!currentChannel) return
        if (isPinned) unpinMessage(currentChannel.id, message.id)
        else pinMessage(currentChannel.id, message.id)
      },
    },
    ...(isOwn || user?.is_superuser
      ? [
          ...(isOwn
            ? [{ label: t('chat.edit'), icon: <Pencil size={12} />, onClick: () => { setEditing(true); setEditContent(message.content) } }]
            : []),
          { label: t('chat.delete'), icon: <Trash2 size={12} />, onClick: handleDelete, danger: true },
        ]
      : []),
  ]

  const quickReactions = ['👍', '❤️', '🔥']

  return (
    <div className="group py-2 px-3">
      <div
        className={`flex gap-3 rounded-ind transition-all ${isOwn ? 'ms-auto max-w-[88%] flex-row-reverse text-right' : 'me-auto max-w-[88%] text-left'}`}
        style={{
          borderInlineStart: !isOwn ? '2px solid transparent' : undefined,
          borderInlineEnd: isOwn ? '2px solid var(--color-accent)' : undefined,
          padding: '0.35rem 0.45rem',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-surface-plate)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <Avatar
          name={message.user.profile?.display_name || message.user.username}
          size="sm"
          src={message.user.profile?.avatar_path || undefined}
        />

        <div className="flex-1 min-w-0">
          <div className={`flex items-baseline gap-2 ${isOwn ? 'flex-row-reverse justify-start' : 'justify-start'}`}>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {message.user.profile?.display_name || message.user.username}
            </span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
            {isPinned && <Pin size={10} style={{ color: 'var(--color-accent)', transform: 'rotate(45deg)' }} />}
            {message.is_edited && (
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {t('chat.edited')}
              </span>
            )}
          </div>

          {message.reply_to_preview && (
            <div
              className={`mt-0.5 text-xs ${isOwn ? 'pe-3 text-right' : 'ps-3 text-left'}`}
              style={{
                borderInlineStart: !isOwn ? '2px solid var(--color-accent)' : undefined,
                borderInlineEnd: isOwn ? '2px solid var(--color-accent)' : undefined,
                color: 'var(--color-text-muted)',
              }}
            >
              <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
                {message.reply_to_preview.user.profile?.display_name || message.reply_to_preview.user.username}
              </span>
              {': '}
              {message.reply_to_preview.content}
            </div>
          )}

          {editing ? (
            <div className="mt-1">
              <input
                className="ind-input text-sm"
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
              {!isAutoContent && (
                <p
                  className={`text-sm whitespace-pre-wrap break-words mt-0.5 ${isOwn ? 'text-right' : 'text-left'}`}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {message.content}
                </p>
              )}
            </>
          )}

          {hasAttachments && message.attachments.map((att) => <FileAttachment key={att.id} attachment={att} />)}

          {message.reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {message.reactions.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => {
                    if (!currentChannel) return
                    if (!r.reacted) addReaction(currentChannel.id, message.id, r.emoji)
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-ind text-xs transition-all"
                  style={{
                    background: r.reacted ? 'var(--color-accent-soft)' : 'var(--color-surface-inset)',
                    border: `1px solid ${r.reacted ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    color: r.reacted ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    boxShadow: r.reacted ? '0 0 4px var(--color-accent-glow)' : 'inset 0 1px 2px var(--color-metal-shadow)',
                  }}
                >
                  <span>{r.emoji}</span>
                  <span>{r.count}</span>
                </button>
              ))}
            </div>
          )}

          <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-0.5 pt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => currentChannel && addReaction(currentChannel.id, message.id, emoji)}
                className="w-6 h-6 flex items-center justify-center rounded-ind text-xs transition-all"
                style={{
                  background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'inset 0 1px 0 var(--color-metal-highlight), 0 1px 2px var(--color-metal-shadow)',
                }}
              >
                {emoji}
              </button>
            ))}
            <DropdownMenu
              trigger={
                <button
                  className="w-6 h-6 flex items-center justify-center rounded-ind text-muted transition-all"
                  style={{
                    background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'inset 0 1px 0 var(--color-metal-highlight), 0 1px 2px var(--color-metal-shadow)',
                  }}
                >
                  <MoreHorizontal size={14} />
                </button>
              }
              items={menuItems}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
