import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Avatar } from '@/components/ui/Avatar'
import { useTranslation } from 'react-i18next'
import { fileApi, type Attachment } from '@/api/files'
import { searchApi } from '@/api/search'
import { messageApi, type Message } from '@/api/messages'
import { extractResults } from '@/api/client'
import { Pin as PinIcon } from 'lucide-react'
import {
  X, Download, Search, FileText, Image, Film, Music,
  FileSpreadsheet, FileCode, Archive, File, Loader2
} from 'lucide-react'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return { icon: Image, color: 'text-accent' }
  if (mimeType.startsWith('video/')) return { icon: Film, color: 'text-lavender' }
  if (mimeType.startsWith('audio/')) return { icon: Music, color: 'text-warning' }
  if (mimeType.includes('pdf')) return { icon: FileText, color: 'text-error' }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return { icon: FileSpreadsheet, color: 'text-success' }
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar') || mimeType.includes('7z'))
    return { icon: Archive, color: 'text-warning' }
  if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('javascript') || mimeType.includes('html'))
    return { icon: FileCode, color: 'text-accent' }
  return { icon: File, color: 'text-muted' }
}

function FileItem({ file }: { file: Attachment }) {
  const isImage = file.mime_type.startsWith('image/')
  const previewUrl = file.preview_url ? `/api${file.preview_url}` : null
  const downloadUrl = `/api${file.download_url}`
  const { icon: FileIcon, color } = getFileIcon(file.mime_type)

  return (
    <div className="flex items-center gap-2.5 p-2 rounded-skeu hover:bg-surface-inset group transition-colors">
      {isImage && previewUrl ? (
        <img src={previewUrl} alt={file.original_filename} className="w-10 h-10 rounded object-cover border border-border-light flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-skeu bg-surface-inset border border-border-light flex items-center justify-center flex-shrink-0">
          <FileIcon size={18} className={color} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{file.original_filename}</div>
        <div className="text-[10px] text-muted">{formatFileSize(file.file_size)}</div>
      </div>
      <a
        href={downloadUrl}
        download={file.original_filename}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-accent hover:bg-accent/10 transition-all"
        title="Download"
      >
        <Download size={14} />
      </a>
    </div>
  )
}

export function RightPanel() {
  const { t } = useTranslation()
  const { rightPanel, setRightPanel, searchQuery, setSearchQuery } = useUIStore()
  const { members, currentChannel } = useWorkspaceStore()
  const [files, setFiles] = useState<Attachment[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState<{ id: number; message: Message; created_at: string }[]>([])
  const [pinnedLoading, setPinnedLoading] = useState(false)

  // Fetch pinned messages
  useEffect(() => {
    if (rightPanel !== 'pinned' || !currentChannel) return
    setPinnedLoading(true)
    messageApi.pinnedMessages(currentChannel.id)
      .then((res) => {
        const items = extractResults(res as unknown as { id: number; message: Message; created_at: string }[])
        setPinnedMessages(Array.isArray(items) ? items : [])
      })
      .catch(() => setPinnedMessages([]))
      .finally(() => setPinnedLoading(false))
  }, [rightPanel, currentChannel?.id])

  useEffect(() => {
    if (rightPanel !== 'files' || !currentChannel) return
    setFilesLoading(true)
    fileApi.channelFiles(currentChannel.id)
      .then((res) => setFiles(extractResults(res)))
      .catch(() => setFiles([]))
      .finally(() => setFilesLoading(false))
  }, [rightPanel, currentChannel?.id])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    try {
      const res = await searchApi.messages({ q: searchQuery })
      setSearchResults(res.results)
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  return (
    <div className="w-[260px] flex-shrink-0 bg-surface-raised border-s border-border-light flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border-light flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {rightPanel === 'members' && t('workspace.members')}
          {rightPanel === 'files' && t('files.browser')}
          {rightPanel === 'pinned' && t('chat.pinned')}
          {rightPanel === 'search' && t('search.messages')}
        </h3>
        <button
          onClick={() => setRightPanel(null)}
          className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-error transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Members */}
        {rightPanel === 'members' && (
          <div className="space-y-1">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 p-1.5 rounded-skeu hover:bg-surface-inset transition-colors">
                <Avatar
                  name={m.user.profile?.display_name || m.user.username}
                  size="sm"
                  status={m.user.profile?.status}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {m.nickname || m.user.profile?.display_name || m.user.username}
                  </div>
                  {m.role && (
                    <div className="text-[10px] text-muted">{m.role.name}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Files */}
        {rightPanel === 'files' && (
          <div>
            {filesLoading ? (
              <div className="flex items-center justify-center py-8 text-muted">
                <Loader2 size={18} className="animate-spin" />
                <span className="ml-2 text-sm">Loading files...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8">
                <File size={32} className="mx-auto text-muted mb-2" />
                <p className="text-sm text-muted">No files in this channel</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {files.map((f) => (
                  <FileItem key={f.id} file={f} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        {rightPanel === 'search' && (
          <div>
            <div className="flex gap-1 mb-3">
              <input
                type="text"
                className="skeu-input text-xs"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch} className="skeu-button !px-2 !py-1.5">
                <Search size={14} />
              </button>
            </div>
            {searchLoading ? (
              <div className="flex items-center justify-center py-8 text-muted">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((msg) => (
                  <div key={msg.id} className="p-2 rounded-skeu bg-surface-inset text-xs">
                    <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {msg.user.profile?.display_name || msg.user.username}
                    </div>
                    <div className="text-muted mt-0.5">{msg.content}</div>
                  </div>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-8">
                <Search size={32} className="mx-auto text-muted mb-2" />
                <p className="text-sm text-muted">No results found</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Pinned */}
        {rightPanel === 'pinned' && (
          <div>
            {pinnedLoading ? (
              <div className="flex items-center justify-center py-8 text-muted">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : pinnedMessages.length === 0 ? (
              <div className="text-center py-8">
                <PinIcon size={32} className="mx-auto text-muted mb-2" />
                <p className="text-sm text-muted">No pinned messages</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pinnedMessages.map((pin) => (
                  <div key={pin.id} className="p-2.5 rounded-skeu bg-surface-inset border border-border-light text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar
                        name={pin.message.user.profile?.display_name || pin.message.user.username}
                        size="sm"
                      />
                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {pin.message.user.profile?.display_name || pin.message.user.username}
                      </span>
                    </div>
                    <p className="text-muted whitespace-pre-wrap">{pin.message.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
