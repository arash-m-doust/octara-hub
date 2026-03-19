import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMessageStore } from '@/stores/messageStore'
import { fileApi } from '@/api/files'
import { useWorkspaceStore } from '@/stores/workspaceStore'

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
      // Refresh messages to show the file message
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
    <div className="flex-shrink-0 px-4 pb-4">
      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-1 px-3 py-1.5 bg-accent-soft rounded-t-skeu text-xs">
          <span className="text-accent">↩ Replying to</span>
          <span className="font-medium">{replyTo.user.profile?.display_name || replyTo.user.username}</span>
          <span className="text-muted truncate flex-1">{replyTo.content}</span>
          <button onClick={() => setReplyTo(null)} className="text-muted hover:text-gray-600">✕</button>
        </div>
      )}

      {error && (
        <div className="text-xs text-danger mb-1 px-3">{error}</div>
      )}

      <div className="flex items-end gap-2 bg-surface-raised rounded-skeu-lg border border-border-light shadow-skeu-panel p-2">
        {/* File upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-8 h-8 flex items-center justify-center rounded-skeu hover:bg-surface-inset text-muted"
          disabled={uploading}
        >
          {uploading ? '⏳' : '📎'}
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

        {/* Text input */}
        <textarea
          className="flex-1 bg-transparent outline-none resize-none text-sm leading-5 max-h-32 min-h-[36px] py-1.5"
          placeholder={placeholder || t('chat.typeMessage')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className="w-8 h-8 flex items-center justify-center rounded-skeu bg-accent text-white disabled:opacity-40 hover:bg-accent/90 transition-colors"
        >
          ➤
        </button>
      </div>
    </div>
  )
}
