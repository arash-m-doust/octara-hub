import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useDMStore } from '@/stores/dmStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { workspaceApi } from '@/api/workspaces'
import { toast } from '@/components/ui/Toast'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MessageSquare, Plus, Settings, LogOut, Menu, Bell } from 'lucide-react'
import { SettingsPanel } from '@/components/settings/SettingsPanel'

export function TopBar() {
  const { t } = useTranslation()
  const {
    workspaces,
    currentWorkspace,
    channels,
    setCurrentWorkspace,
    createWorkspace,
    fetchWorkspaces,
  } = useWorkspaceStore()
  const { threads } = useDMStore()
  const { view, setView, isMobileMenuOpen, setMobileMenuOpen } = useUIStore()
  const { user, logout } = useAuthStore()
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
  } = useNotificationStore()

  const [showCreate, setShowCreate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [newName, setNewName] = useState('')
  const notificationPanelRef = useRef<HTMLDivElement>(null)

  const canCreateWorkspace = !!user && (user.is_superuser || user.is_staff)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationPanelRef.current) return
      if (!notificationPanelRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCreate = async () => {
    if (!canCreateWorkspace || !newName.trim()) return
    const ws = await createWorkspace({ name: newName.trim() })
    setCurrentWorkspace(ws)
    setShowCreate(false)
    setNewName('')
  }

  const getWorkspaceUnread = (workspaceId: number) => {
    if (currentWorkspace?.id !== workspaceId) return 0
    return channels.reduce((sum, channel) => sum + (channel.unread_count || 0), 0)
  }

  const totalDmUnread = threads.reduce((sum, thread) => sum + (thread.unread_count || 0), 0)

  const handleLeaveWorkspace = async (workspaceId: number, workspaceName: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!confirm(`Leave "${workspaceName}"?`)) return

    try {
      await workspaceApi.leave(workspaceId)
      await fetchWorkspaces()
      const latest = useWorkspaceStore.getState().workspaces
      setCurrentWorkspace(latest[0] ?? null)
      setView('workspace')
      toast.success(`You left "${workspaceName}"`)
    } catch {
      toast.error('Failed to leave workspace')
    }
  }

  return (
    <>
      <div
        className="h-12 flex-shrink-0 flex items-center px-2 gap-1 border-b"
        style={{
          background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
          borderColor: 'var(--color-border-groove)',
          boxShadow: 'inset 0 1px 0 var(--color-metal-highlight), 0 2px 4px var(--color-metal-shadow)',
        }}
      >
        <button
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-ind ind-button p-0"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <Menu size={16} />
        </button>

        <button
          onClick={() => setView('dm')}
          className="h-8 px-3 flex items-center gap-1.5 rounded-ind text-xs font-semibold transition-all relative"
          style={{
            background: view === 'dm'
              ? 'linear-gradient(180deg, var(--color-accent) 0%, color-mix(in srgb, var(--color-accent) 75%, black) 100%)'
              : 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
            color: view === 'dm' ? 'white' : 'var(--color-text-secondary)',
            border: `1px solid ${view === 'dm' ? 'color-mix(in srgb, var(--color-accent) 60%, black)' : 'var(--color-border)'}`,
            boxShadow: view === 'dm'
              ? '0 0 8px var(--color-accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)'
              : 'inset 0 1px 0 var(--color-metal-highlight), 0 1px 2px var(--color-metal-shadow)',
          }}
        >
          <MessageSquare size={14} />
          <span className="hidden sm:inline">{t('dm.title')}</span>
          {totalDmUnread > 0 && (
            <span
              className="absolute -top-1 -end-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
              style={{ backgroundColor: '#FF5252' }}
            >
              {totalDmUnread > 9 ? '9+' : totalDmUnread}
            </span>
          )}
        </button>

        <div className="w-px h-6 mx-1" style={{ background: 'linear-gradient(180deg, var(--color-border-groove), var(--color-metal-highlight), var(--color-border-groove))' }} />

        <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {workspaces.map((workspace) => {
            const isActive = view === 'workspace' && currentWorkspace?.id === workspace.id
            const workspaceUnread = getWorkspaceUnread(workspace.id)

            return (
              <div key={workspace.id} className="relative flex-shrink-0">
                <button
                  onClick={() => { setCurrentWorkspace(workspace); setView('workspace') }}
                  className={`h-8 px-3 ${!workspace.is_owner && isActive ? 'pe-6' : ''} flex items-center gap-1.5 rounded-ind text-xs font-semibold transition-all relative`}
                  style={{
                    background: isActive
                      ? 'linear-gradient(180deg, var(--color-surface-inset) 0%, var(--color-surface) 100%)'
                      : 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    boxShadow: isActive
                      ? 'inset 0 2px 4px var(--color-metal-shadow), 0 0 6px var(--color-accent-glow)'
                      : 'inset 0 1px 0 var(--color-metal-highlight), 0 1px 2px var(--color-metal-shadow)',
                  }}
                >
                  {workspace.icon_path ? (
                    <img src={workspace.icon_path} alt={workspace.name} className="w-5 h-5 rounded object-cover" />
                  ) : (
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                      style={{ background: isActive ? 'var(--color-accent-soft)' : 'var(--color-surface-inset)' }}
                    >
                      {workspace.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="hidden sm:inline truncate max-w-[100px]">{workspace.name}</span>

                  {workspaceUnread > 0 && !isActive && (
                    <span
                      className="absolute -top-1 -end-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
                      style={{ backgroundColor: '#FF5252', boxShadow: '0 0 4px rgba(255,82,82,0.5)' }}
                    >
                      {workspaceUnread > 9 ? '9+' : workspaceUnread}
                    </span>
                  )}

                  {isActive && (
                    <span
                      className="absolute -bottom-px start-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--color-accent)',
                        boxShadow: '0 0 6px var(--color-accent-glow)',
                      }}
                    />
                  )}
                </button>

                {!workspace.is_owner && isActive && (
                  <button
                    onClick={(event) => void handleLeaveWorkspace(workspace.id, workspace.name, event)}
                    className="absolute top-1/2 -translate-y-1/2 end-1 w-4 h-4 flex items-center justify-center rounded text-muted hover:text-error"
                    title="Leave workspace"
                    aria-label="Leave workspace"
                  >
                    <LogOut size={10} />
                  </button>
                )}
              </div>
            )
          })}

          {canCreateWorkspace && (
            <button
              onClick={() => setShowCreate(true)}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-ind ind-button p-0"
              title={t('workspace.create')}
              aria-label="Create new workspace"
            >
              <Plus size={14} className="text-accent" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 ms-2" ref={notificationPanelRef}>
          <div className="relative">
            <button
              onClick={() => {
                const next = !showNotifications
                setShowNotifications(next)
                if (next) {
                  void fetchNotifications()
                }
              }}
              className="w-8 h-8 flex items-center justify-center rounded-ind ind-button p-0"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={14} className="text-muted" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -end-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                  style={{ backgroundColor: '#FF5252' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className="absolute top-full mt-2 end-0 w-80 rounded-ind-lg p-2"
                style={{
                  background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface-plate) 100%)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 8px 24px var(--color-metal-shadow)',
                  zIndex: 60,
                }}
              >
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>Notifications</span>
                  <button
                    onClick={() => void markAllRead()}
                    className="text-[10px] hover:underline"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-1 p-1">
                  {notifications.length === 0 ? (
                    <div className="text-xs px-2 py-3" style={{ color: 'var(--color-text-muted)' }}>
                      No notifications.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (!item.is_read) {
                            void markRead(item.id)
                          }
                        }}
                        className="w-full text-start p-2 rounded-ind transition-colors hover:bg-surface-inset"
                        style={{
                          border: item.is_read ? '1px solid transparent' : '1px solid var(--color-accent)',
                          background: item.is_read ? 'transparent' : 'var(--color-accent-soft)',
                        }}
                      >
                        <div className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.title}</div>
                        {item.body && (
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{item.body}</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 flex items-center justify-center rounded-ind ind-button p-0"
            title="Settings"
            aria-label="Open settings"
          >
            <Settings size={14} className="text-muted" />
          </button>
          <button
            onClick={logout}
            className="w-8 h-8 flex items-center justify-center rounded-ind ind-button p-0"
            title="Logout"
            aria-label="Log out"
          >
            <LogOut size={14} className="text-muted" />
          </button>
          <Avatar
            name={user?.profile?.display_name || user?.username || '?'}
            size="sm"
            status={user?.profile?.status || 'online'}
          />
        </div>
      </div>

      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <Modal isOpen={showCreate && canCreateWorkspace} onClose={() => setShowCreate(false)} title={t('workspace.create')}>
        <div className="space-y-4">
          <Input
            label={t('workspace.name')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={() => void handleCreate()}>{t('workspace.create')}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
