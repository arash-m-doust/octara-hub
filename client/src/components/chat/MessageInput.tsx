import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMessageStore } from '@/stores/messageStore'
import { fileApi } from '@/api/files'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Paperclip, Send, X, Loader2 } from 'lucide-react'

interface MessageInputProps {
  onSend: (content: string) => void
  placeholder?: string
}

export function MessageInput({ onSend, placeholder }: MessageInputProps) {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const { replyTo, setReplyTo, fetchMessages } = useMessageStore()
  const { currentChannel } = useWorkspaceStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (!content.trim()) return
    setError('')
    try {
      onSend(content.trim())
      setContent('')
    } catch {
      setError('Failed to send message')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentChannel) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('channel_id', String(currentChannel.id))
      await fileApi.upload(formData)
      await fetchMessages(currentChannel.id)
    } catch (err) {
      console.error('File upload failed:', err)
      setError('Failed to upload file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex-shrink-0 px-4 pb-3">
      {/* Reply indicator */}
      {replyTo && (
        <div
          className="flex items-center gap-2 mb-1 px-3 py-1.5 text-xs"
          style={{
            background: 'var(--color-accent-soft)',
            borderRadius: '6px 6px 0 0',
            borderLeft: '2px solid var(--color-accent)',
          }}
        >
          <span style={{ color: 'var(--color-accent)' }}>Replying to</span>
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{replyTo.user.profile?.display_name || replyTo.user.username}</span>
          <span className="text-muted truncate flex-1">{replyTo.content}</span>
          <button onClick={() => setReplyTo(null)} className="text-muted hover:text-error transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="text-xs text-error mb-1 px-3">{error}</div>
      )}

      {/* Input bar — recessed metal panel */}
      <div
        className="flex items-end gap-2 p-2 rounded-ind-lg"
        style={{
          background: 'var(--color-surface-inset)',
          border: '1px solid var(--color-border-groove)',
          boxShadow: 'inset 0 2px 4px var(--color-metal-shadow)',
        }}
      >
        {/* File upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-8 h-8 flex items-center justify-center rounded-ind ind-button p-0 text-muted"
          disabled={uploading}
          title="Attach file"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

        {/* Text input */}
        <textarea
          className="flex-1 bg-transparent outline-none resize-none text-sm leading-5 max-h-32 min-h-[36px] py-1.5"
          style={{ color: 'var(--color-text-primary)' }}
          placeholder={placeholder || t('chat.typeMessage')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        {/* Send button — cyan when content present */}
        <button
          onClick={handleSend}
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
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
