import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMessageStore } from '@/stores/messageStore'
import { useDMStore } from '@/stores/dmStore'
import { EmojiPicker } from '@/components/chat/EmojiPicker'
import { dmApi } from '@/api/dm'
import { fileApi } from '@/api/files'
import { messageApi } from '@/api/messages'
import { toast } from '@/components/ui/Toast'
import { Paperclip, Send, X, Loader2 } from 'lucide-react'

interface UploadTarget {
  type: 'channel' | 'dm'
  id: number
}

interface MessageInputProps {
  onSend: (content: string) => void | Promise<void>
  placeholder?: string
  uploadTarget: UploadTarget
}

export function MessageInput({ onSend, placeholder, uploadTarget }: MessageInputProps) {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const { replyTo, setReplyTo, fetchMessages: fetchChannelMessages } = useMessageStore()
  const {
    fetchMessages: fetchDMMessages,
    replyTo: dmReplyTo,
    setReplyTo: setDmReplyTo,
  } = useDMStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeReply = uploadTarget.type === 'dm' ? dmReplyTo : replyTo

  const handleSend = async () => {
    if (!content.trim()) return
    setError('')
    try {
      await Promise.resolve(onSend(content.trim()))
      setContent('')
    } catch {
      const msg = 'Failed to send message'
      setError(msg)
      toast.error(msg)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const notifyTyping = () => {
    if (!typingTimer.current) {
      if (uploadTarget.type === 'channel') {
        messageApi.typing(uploadTarget.id).catch(() => {})
      } else {
        dmApi.typing(uploadTarget.id).catch(() => {})
      }
    }
    if (typingTimer.current) {
      clearTimeout(typingTimer.current)
    }
    typingTimer.current = setTimeout(() => {
      typingTimer.current = null
    }, 2000)
  }

  const handleEmojiInsert = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setContent((prev) => `${prev}${emoji}`)
      notifyTyping()
      return
    }

    const start = textarea.selectionStart ?? textarea.value.length
    const end = textarea.selectionEnd ?? textarea.value.length

    setContent((prev) => {
      const safeStart = Math.min(start, prev.length)
      const safeEnd = Math.min(end, prev.length)
      return `${prev.slice(0, safeStart)}${emoji}${prev.slice(safeEnd)}`
    })
    notifyTyping()

    requestAnimationFrame(() => {
      textarea.focus()
      const caret = start + emoji.length
      textarea.setSelectionRange(caret, caret)
    })
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (uploadTarget.type === 'channel') {
        formData.append('channel_id', String(uploadTarget.id))
      } else {
        formData.append('dm_thread_id', String(uploadTarget.id))
      }

      await fileApi.upload(formData)

      if (uploadTarget.type === 'channel') {
        await fetchChannelMessages(uploadTarget.id)
      } else {
        await fetchDMMessages(uploadTarget.id)
      }
    } catch (err) {
      console.error('File upload failed:', err)
      const msg = 'Failed to upload file'
      setError(msg)
      toast.error(msg)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      await uploadFile(file)
    }
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find((item) => item.type.startsWith('image/'))
    if (!imageItem) return

    e.preventDefault()
    const file = imageItem.getAsFile()
    if (file) {
      await uploadFile(file)
    }
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    notifyTyping()
  }

  return (
    <div
      className={`relative flex-shrink-0 px-4 pb-3 ${isDragging ? 'opacity-80' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 rounded-ind-lg"
          style={{
            background: 'var(--color-accent-soft)',
            border: '2px dashed var(--color-accent)',
            borderRadius: 8,
            pointerEvents: 'none',
          }}
        >
          <span style={{ color: 'var(--color-accent)', fontSize: 14 }}>Drop file to upload</span>
        </div>
      )}

      {/* Reply indicator */}
      {activeReply && (
        <div
          className="flex items-center gap-2 mb-1 px-3 py-1.5 text-xs"
          style={{
            background: 'var(--color-accent-soft)',
            borderRadius: '6px 6px 0 0',
            borderInlineStart: '2px solid var(--color-accent)',
          }}
        >
          <span style={{ color: 'var(--color-accent)' }}>Replying to</span>
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {activeReply.user.profile?.display_name || activeReply.user.username}
          </span>
          <span className="text-muted truncate flex-1" dir="auto" style={{ unicodeBidi: 'plaintext' }}>{activeReply.content}</span>
          <button
            onClick={() => {
              if (uploadTarget.type === 'dm') {
                setDmReplyTo(null)
                return
              }
              setReplyTo(null)
            }}
            className="text-muted hover:text-error transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && <div className="text-xs text-error mb-1 px-3">{error}</div>}

      {/* Input bar */}
      <div
        className="flex items-end gap-2 p-2 rounded-ind-lg"
        style={{
          background: 'var(--color-surface-inset)',
          border: '1px solid var(--color-border-groove)',
          boxShadow: 'inset 0 2px 4px var(--color-metal-shadow)',
        }}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-8 h-8 flex items-center justify-center rounded-ind ind-button p-0 text-muted"
          disabled={uploading}
          title="Attach file"
          aria-label="Attach file"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

        <EmojiPicker onSelect={handleEmojiInsert} position="top" title="Insert emoji" />

        <textarea
          ref={textareaRef}
          className="flex-1 bg-transparent outline-none resize-none text-sm leading-5 max-h-32 min-h-[36px] py-1.5"
          style={{ color: 'var(--color-text-primary)', unicodeBidi: 'plaintext' }}
          placeholder={placeholder || t('chat.typeMessage')}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          dir="auto"
          rows={1}
        />

        <button
          onClick={() => void handleSend()}
          disabled={!content.trim()}
          className="w-8 h-8 flex items-center justify-center rounded-ind transition-all"
          style={{
            background: content.trim()
              ? 'linear-gradient(180deg, var(--color-accent) 0%, color-mix(in srgb, var(--color-accent) 75%, black) 100%)'
              : 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
            border: `1px solid ${content.trim() ? 'color-mix(in srgb, var(--color-accent) 60%, black)' : 'var(--color-border)'}`,
            color: content.trim() ? 'white' : 'var(--color-text-muted)',
            boxShadow: content.trim()
              ? '0 0 8px var(--color-accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)'
              : 'inset 0 1px 0 var(--color-metal-highlight), 0 1px 2px var(--color-metal-shadow)',
            opacity: content.trim() ? 1 : 0.5,
          }}
          title="Send"
          aria-label="Send message"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
