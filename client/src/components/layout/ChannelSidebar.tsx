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

export function ChannelSidebar() {
  const { t } = useTranslation()
  const { currentWorkspace, categories, channels, currentChannel, setCurrentChannel, createChannel, createCategory } = useWorkspaceStore()
  const { view } = useUIStore()
  const { threads, currentThread, setCurrentThread, fetchThreads } = useDMStore()
  const { user } = useAuthStore()
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>()
  const [isPrivate, setIsPrivate] = useState(false)

  // DM view
  if (view === 'dm') {
    return (
      <div className="w-[240px] flex-shrink-0 bg-surface-raised border-e border-border-light flex flex-col">
        <div className="p-3 border-b border-border-light">
          <h2 className="font-semibold text-sm text-gray-700">{t('dm.title')}</h2>
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
                  <div className="text-sm font-medium truncate">{displayName}</div>
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
    if (!newName.trim() || !currentWorkspace) return
    const ch = await createChannel(currentWorkspace.id, {
      name: newName.trim().toLowerCase().replace(/\s+/g, '-'),
      category: selectedCategory,
      is_private: isPrivate,
    })
    setCurrentChannel(ch)
    setShowCreateChannel(false)
    setNewName('')
    setIsPrivate(false)
  }

  const handleCreateCategory = async () => {
    if (!newName.trim() || !currentWorkspace) return
    await createCategory(currentWorkspace.id, { name: newName.trim() })
    setShowCreateCategory(false)
    setNewName('')
  }

  return (
    <div className="w-[240px] flex-shrink-0 bg-surface-raised border-e border-border-light flex flex-col">
      {/* Workspace Header */}
      <div className="p-3 border-b border-border-light flex items-center justify-between">
        <h2 className="font-semibold text-sm text-gray-700 truncate">{currentWorkspace.name}</h2>
        <button
          onClick={() => setShowCreateChannel(true)}
          className="text-muted hover:text-accent text-lg"
          title={t('channel.create')}
        >
          +
        </button>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {categories.map((cat) => (
          <div key={cat.id}>
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">{cat.name}</span>
            </div>
            <div className="space-y-0.5">
              {channels
                .filter((ch) => ch.category === cat.id)
                .map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setCurrentChannel(ch)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-skeu text-start text-sm transition-colors ${
                      currentChannel?.id === ch.id ? 'bg-accent-soft text-accent font-medium' : 'text-gray-600 hover:bg-surface-inset'
                    }`}
                  >
                    <span className="text-muted">{ch.is_private ? '🔒' : '#'}</span>
                    <span className="truncate">{ch.name}</span>
                    <Badge count={ch.unread_count} />
                  </button>
                ))}
            </div>
          </div>
        ))}

        {/* Uncategorized channels */}
        {channels.filter((ch) => !ch.category).length > 0 && (
          <div>
            <div className="space-y-0.5">
              {channels
                .filter((ch) => !ch.category)
                .map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setCurrentChannel(ch)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-skeu text-start text-sm transition-colors ${
                      currentChannel?.id === ch.id ? 'bg-accent-soft text-accent font-medium' : 'text-gray-600 hover:bg-surface-inset'
                    }`}
                  >
                    <span className="text-muted">{ch.is_private ? '🔒' : '#'}</span>
                    <span className="truncate">{ch.name}</span>
                    <Badge count={ch.unread_count} />
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* User Bar */}
      <div className="p-2 border-t border-border-light">
        <div className="flex items-center gap-2 px-1">
          <Avatar name={user?.profile?.display_name || user?.username || '?'} size="sm" status="online" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{user?.profile?.display_name || user?.username}</div>
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      <Modal isOpen={showCreateChannel} onClose={() => setShowCreateChannel(false)} title={t('channel.create')}>
        <div className="space-y-3">
          <Input
            label={t('channel.name')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="new-channel"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="private" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            <label htmlFor="private" className="text-sm">{t('channel.private')}</label>
          </div>
          <select
            className="skeu-input"
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateChannel(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleCreateChannel}>{t('channel.create')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
