import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MessageSquare, Plus, Settings, LogOut, Menu } from 'lucide-react'
import { SettingsPanel } from '@/components/settings/SettingsPanel'

export function TopBar() {
  const { t } = useTranslation()
  const { workspaces, currentWorkspace, setCurrentWorkspace, createWorkspace } = useWorkspaceStore()
  const { view, setView, isMobileMenuOpen, setMobileMenuOpen } = useUIStore()
  const { user, logout } = useAuthStore()
  const [showCreate, setShowCreate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    const ws = await createWorkspace({ name: newName.trim() })
    setCurrentWorkspace(ws)
    setShowCreate(false)
    setNewName('')
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
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-ind ind-button p-0"
        >
          <Menu size={16} />
        </button>

        {/* DM Button */}
        <button
          onClick={() => setView('dm')}
          className="h-8 px-3 flex items-center gap-1.5 rounded-ind text-xs font-semibold transition-all"
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
        </button>

        {/* Divider */}
        <div className="w-px h-6 mx-1" style={{ background: 'linear-gradient(180deg, var(--color-border-groove), var(--color-metal-highlight), var(--color-border-groove))' }} />

        {/* Workspace Tabs */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {workspaces.map((ws) => {
            const isActive = view === 'workspace' && currentWorkspace?.id === ws.id
            return (
              <button
                key={ws.id}
                onClick={() => { setCurrentWorkspace(ws); setView('workspace') }}
                className="h-8 px-3 flex items-center gap-1.5 rounded-ind text-xs font-semibold transition-all flex-shrink-0 relative"
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
                {ws.icon_path ? (
                  <img src={ws.icon_path} alt={ws.name} className="w-5 h-5 rounded object-cover" />
                ) : (
                  <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold" style={{
                    background: isActive ? 'var(--color-accent-soft)' : 'var(--color-surface-inset)',
                  }}>
                    {ws.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:inline truncate max-w-[100px]">{ws.name}</span>
                {/* Active LED indicator */}
                {isActive && (
                  <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{
                    backgroundColor: 'var(--color-accent)',
                    boxShadow: '0 0 6px var(--color-accent-glow)',
                  }} />
                )}
              </button>
            )
          })}

          {/* Add Workspace */}
          <button
            onClick={() => setShowCreate(true)}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-ind ind-button p-0"
            title={t('workspace.create')}
          >
            <Plus size={14} className="text-accent" />
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1 ms-2">
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 flex items-center justify-center rounded-ind ind-button p-0"
            title="Settings"
          >
            <Settings size={14} className="text-muted" />
          </button>
          <button
            onClick={logout}
            className="w-8 h-8 flex items-center justify-center rounded-ind ind-button p-0"
            title="Logout"
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

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t('workspace.create')}>
        <div className="space-y-4">
          <Input
            label={t('workspace.name')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleCreate}>{t('workspace.create')}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
