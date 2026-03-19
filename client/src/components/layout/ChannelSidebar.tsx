import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useUIStore } from '@/stores/uiStore'
import { useDMStore } from '@/stores/dmStore'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/authStore'
import { Hash, Lock, FolderPlus, Plus, ChevronDown, Settings } from 'lucide-react'

export function ChannelSidebar() {
  const { t } = useTranslation()
  const { currentWorkspace, categories, channels, currentChannel, setCurrentChannel, createChannel, createCategory } = useWorkspaceStore()
  const { view } = useUIStore()
  const { threads, currentThread, setCurrentThread } = useDMStore()
  const { user } = useAuthStore()
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>()
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState('')

  // DM view
  if (view === 'dm') {
    return (
      <div className="w-[240px] flex-shrink-0 bg-surface-raised border-e border-border-light flex flex-col">
        <div className="p-3 border-b border-border-light">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{t('dm.title')}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {threads.map((thread) => {
            const otherParticipants = thread.participants.filter((p) => p.user.id !== user?.id)
            const displayName = thread.is_group
              ? thread.name || otherParticipants.map((p) => p.user.profile?.display_name || p.user.username).join(', ')
              : otherParticipants[0]?.user.profile?.display_name || otherParticipants[0]?.user.username || 'Unknown'

            return (
              <button
                key={thread.id}
                onClick={() => setCurrentThread(thread)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-skeu text-start transition-colors ${
                  currentThread?.id === thread.id ? 'bg-accent-soft' : 'hover:bg-surface-inset'
                }`}
              >
                <Avatar name={displayName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{displayName}</div>
                  {thread.last_message && (
                    <div className="text-xs text-muted truncate">{thread.last_message.content}</div>
                  )}
                </div>
                <Badge count={thread.unread_count} />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Workspace view
  if (!currentWorkspace) {
    return (
      <div className="w-[240px] flex-shrink-0 bg-surface-raised border-e border-border-light flex items-center justify-center">
        <p className="text-sm text-muted">{t('workspace.create')}</p>
      </div>
    )
  }

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !currentWorkspace) return
    setError('')
    try {
      const ch = await createChannel(currentWorkspace.id, {
        name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
        category: selectedCategory,
        is_private: isPrivate,
      })
      setCurrentChannel(ch)
      setShowCreateChannel(false)
      setNewChannelName('')
      setIsPrivate(false)
      setSelectedCategory(undefined)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'detail' in err ? String((err as { detail: string }).detail) : 'Failed to create channel'
      setError(msg)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !currentWorkspace) return
    setError('')
    try {
      await createCategory(currentWorkspace.id, { name: newCategoryName.trim() })
      setShowCreateCategory(false)
      setNewCategoryName('')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'detail' in err ? String((err as { detail: string }).detail) : 'Failed to create category'
      setError(msg)
    }
  }

  const renderChannel = (ch: typeof channels[0]) => (
    <button
      key={ch.id}
      onClick={() => setCurrentChannel(ch)}
      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-skeu text-start text-sm transition-colors ${
        currentChannel?.id === ch.id ? 'bg-accent-soft text-accent font-medium' : 'hover:bg-surface-inset'
      }`}
      style={currentChannel?.id !== ch.id ? { color: 'var(--color-text-secondary)' } : {}}
    >
      {ch.is_private ? <Lock size={14} className="text-muted flex-shrink-0" /> : <Hash size={14} className="text-muted flex-shrink-0" />}
      <span className="truncate">{ch.name}</span>
      <Badge count={ch.unread_count} />
    </button>
  )

  return (
    <div className="w-[240px] flex-shrink-0 bg-surface-raised border-e border-border-light flex flex-col">
      {/* Workspace Header */}
      <div className="p-3 border-b border-border-light flex items-center justify-between">
        <h2 className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{currentWorkspace.name}</h2>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { setShowCreateCategory(true); setError('') }}
            className="w-7 h-7 flex items-center justify-center rounded-skeu text-muted hover:text-accent hover:bg-surface-inset transition-colors"
            title="Create Category"
          >
            <FolderPlus size={14} />
          </button>
          <button
            onClick={() => { setShowCreateChannel(true); setError('') }}
            className="w-7 h-7 flex items-center justify-center rounded-skeu text-muted hover:text-accent hover:bg-surface-inset transition-colors"
            title={t('channel.create')}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {categories.map((cat) => (
          <div key={cat.id}>
            <div className="flex items-center gap-1 px-1 mb-1">
              <ChevronDown size={12} className="text-muted" />
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">{cat.name}</span>
            </div>
            <div className="space-y-0.5">
              {channels.filter((ch) => ch.category === cat.id).map(renderChannel)}
            </div>
          </div>
        ))}

        {/* Uncategorized channels */}
        {channels.filter((ch) => !ch.category).length > 0 && (
          <div className="space-y-0.5">
            {channels.filter((ch) => !ch.category).map(renderChannel)}
          </div>
        )}

        {categories.length === 0 && channels.length === 0 && (
          <div className="text-center py-4">
            <Hash size={24} className="mx-auto text-muted mb-2" />
            <p className="text-xs text-muted">No channels yet</p>
            <button
              onClick={() => { setShowCreateChannel(true); setError('') }}
              className="text-xs text-accent hover:underline mt-1"
            >
              Create your first channel
            </button>
          </div>
        )}
      </div>

      {/* User Bar */}
      <div className="p-2 border-t border-border-light">
        <div className="flex items-center gap-2 px-1">
          <Avatar
            name={user?.profile?.display_name || user?.username || '?'}
            size="sm"
            status={user?.profile?.status || 'online'}
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
              {user?.profile?.display_name || user?.username}
            </div>
            <div className="text-[10px] text-muted capitalize">{user?.profile?.status || 'online'}</div>
          </div>
          <button
            className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-accent transition-colors"
            title="User Settings"
          >
            <Settings size={13} />
          </button>
        </div>
      </div>

      {/* Create Channel Modal */}
      <Modal isOpen={showCreateChannel} onClose={() => setShowCreateChannel(false)} title={t('channel.create')}>
        <div className="space-y-3">
          <Input
            label={t('channel.name')}
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
            placeholder="new-channel"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="private" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            <label htmlFor="private" className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
              <span className="inline-flex items-center gap-1">
                <Lock size={12} /> {t('channel.private')}
              </span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Category</label>
            <select
              className="skeu-input w-full"
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateChannel(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleCreateChannel}>{t('channel.create')}</Button>
          </div>
        </div>
      </Modal>

      {/* Create Category Modal */}
      <Modal isOpen={showCreateCategory} onClose={() => setShowCreateCategory(false)} title="Create Category">
        <div className="space-y-3">
          <Input
            label="Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
            placeholder="e.g. Development"
            autoFocus
          />
          {error && <p className="text-xs text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateCategory(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleCreateCategory}>Create Category</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
