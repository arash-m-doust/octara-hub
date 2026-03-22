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
import { Lock, FolderPlus, Plus, ChevronDown } from 'lucide-react'

export function ChannelSidebar() {
  const { t } = useTranslation()
  const { currentWorkspace, categories, channels, currentChannel, setCurrentChannel, createChannel, createCategory } = useWorkspaceStore()
  const { view, setMobileMenuOpen } = useUIStore()
  const { threads, currentThread, setCurrentThread } = useDMStore()
  const { user } = useAuthStore()
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>()
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState('')

  const selectChannel = (ch: typeof channels[0]) => {
    setCurrentChannel(ch)
    setMobileMenuOpen(false)
  }

  // DM view
  if (view === 'dm') {
    return (
      <div
        className="w-[240px] flex-shrink-0 flex flex-col border-e"
        style={{
          background: 'linear-gradient(180deg, var(--color-surface-plate) 0%, var(--color-surface-inset) 100%)',
          borderColor: 'var(--color-border-groove)',
        }}
      >
        <div className="p-3 border-b" style={{ borderColor: 'var(--color-border-groove)' }}>
          <h2 className="ind-label text-xs">{t('dm.title')}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {threads.map((thread) => {
            const otherParticipants = thread.participants.filter((p) => p.user.id !== user?.id)
            const displayName = thread.is_group
              ? thread.name || otherParticipants.map((p) => p.user.profile?.display_name || p.user.username).join(', ')
              : otherParticipants[0]?.user.profile?.display_name || otherParticipants[0]?.user.username || 'Unknown'
            const isActive = currentThread?.id === thread.id

            return (
              <button
                key={thread.id}
                onClick={() => { setCurrentThread(thread); setMobileMenuOpen(false) }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-ind text-start transition-all"
                style={{
                  background: isActive
                    ? 'linear-gradient(180deg, var(--color-surface-inset) 0%, var(--color-surface) 100%)'
                    : 'transparent',
                  border: isActive ? '1px solid var(--color-accent)' : '1px solid transparent',
                  boxShadow: isActive ? 'inset 0 2px 4px var(--color-metal-shadow), 0 0 6px var(--color-accent-glow)' : 'none',
                }}
              >
                <Avatar name={displayName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>{displayName}</div>
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
      <div
        className="w-[240px] flex-shrink-0 flex items-center justify-center border-e"
        style={{
          background: 'var(--color-surface-plate)',
          borderColor: 'var(--color-border-groove)',
        }}
      >
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

  const renderChannel = (ch: typeof channels[0]) => {
    const isActive = currentChannel?.id === ch.id
    const hasUnread = ch.unread_count > 0

    return (
      <button
        key={ch.id}
        onClick={() => selectChannel(ch)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-ind text-start text-sm transition-all"
        style={{
          background: isActive
            ? 'linear-gradient(180deg, var(--color-surface-inset) 0%, var(--color-surface) 100%)'
            : 'transparent',
          border: isActive ? '1px solid var(--color-accent)' : '1px solid transparent',
          boxShadow: isActive ? 'inset 0 2px 4px var(--color-metal-shadow), 0 0 6px var(--color-accent-glow)' : 'none',
          color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          fontWeight: isActive ? 600 : 400,
        }}
      >
        {/* LED indicator */}
        <span
          className={`ind-led ${hasUnread ? 'ind-led-pulse' : ''}`}
          style={{
            backgroundColor: isActive
              ? 'var(--color-accent)'
              : hasUnread
                ? 'var(--color-accent)'
                : 'var(--color-led-off)',
            boxShadow: isActive || hasUnread
              ? '0 0 4px var(--color-accent-glow), 0 0 8px var(--color-accent-glow)'
              : 'none',
          }}
        />
        {ch.is_private && <Lock size={12} className="text-muted flex-shrink-0" />}
        <span className="truncate">{ch.name}</span>
        <Badge count={ch.unread_count} variant="accent" />
      </button>
    )
  }

  return (
    <div
      className="w-[240px] flex-shrink-0 flex flex-col border-e"
      style={{
        background: 'linear-gradient(180deg, var(--color-surface-plate) 0%, var(--color-surface-inset) 100%)',
        borderColor: 'var(--color-border-groove)',
      }}
    >
      {/* Workspace Header */}
      <div className="p-3 flex items-center justify-between" style={{ borderBottom: '2px solid transparent', borderImage: 'linear-gradient(90deg, var(--color-border-groove), var(--color-metal-highlight), var(--color-border-groove)) 1' }}>
        <h2 className="ind-label text-xs truncate">{currentWorkspace.name}</h2>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { setShowCreateCategory(true); setError('') }}
            className="w-6 h-6 flex items-center justify-center rounded-ind text-muted hover:text-accent transition-colors"
            title="Create Category"
          >
            <FolderPlus size={13} />
          </button>
          <button
            onClick={() => { setShowCreateChannel(true); setError('') }}
            className="w-6 h-6 flex items-center justify-center rounded-ind text-muted hover:text-accent transition-colors"
            title={t('channel.create')}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {categories.map((cat) => (
          <div key={cat.id}>
            {/* Category header — riveted divider */}
            <div className="flex items-center gap-1.5 px-1 mb-1.5">
              <ChevronDown size={10} className="text-muted" />
              <span className="ind-label">{cat.name}</span>
              <div className="flex-1 ind-groove" />
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
          <div className="text-center py-6">
            <div className="w-8 h-8 mx-auto mb-2 rounded-full ind-recess flex items-center justify-center">
              <span className="ind-led" style={{ backgroundColor: 'var(--color-led-off)', width: '10px', height: '10px' }} />
            </div>
            <p className="text-xs text-muted mb-1">No channels yet</p>
            <button
              onClick={() => { setShowCreateChannel(true); setError('') }}
              className="text-xs text-accent hover:underline"
            >
              Create your first channel
            </button>
          </div>
        )}
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
            <input type="checkbox" id="private" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="accent-[var(--color-accent)]" />
            <label htmlFor="private" className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
              <span className="inline-flex items-center gap-1">
                <Lock size={12} /> {t('channel.private')}
              </span>
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary)' }}>Category</label>
            <select
              className="ind-input w-full"
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
