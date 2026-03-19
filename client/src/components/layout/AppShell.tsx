import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useUIStore } from '@/stores/uiStore'
import { realtime } from '@/realtime/connection'
import { useAuthStore } from '@/stores/authStore'
import { ServerRail } from './ServerRail'
import { ChannelSidebar } from './ChannelSidebar'
import { MainPanel } from './MainPanel'
import { RightPanel } from './RightPanel'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { Shield, Settings, LogOut } from 'lucide-react'

export function AppShell() {
  const { user, logout } = useAuthStore()
  const { fetchWorkspaces } = useWorkspaceStore()
  const { rightPanel } = useUIStore()
  const [showAdmin, setShowAdmin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])
  useEffect(() => {
    if (user) { realtime.connect(); return () => realtime.disconnect() }
  }, [user])

  // Apply saved theme on mount
  useEffect(() => {
    if (user?.profile?.theme) {
      document.documentElement.setAttribute('data-theme', user.profile.theme)
    }
  }, [user?.profile?.theme])

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <ServerRail />
      <ChannelSidebar />
      <MainPanel />
      {rightPanel && <RightPanel />}

      {/* Top-right controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1 z-50">
        {user?.is_superuser && (
          <button
            onClick={() => setShowAdmin(true)}
            className="w-8 h-8 flex items-center justify-center rounded-skeu bg-surface-raised shadow-skeu-embossed hover:shadow-skeu-raised transition-all"
            title="Admin Panel"
          >
            <Shield size={15} className="text-accent" />
          </button>
        )}
        <button
          onClick={() => setShowSettings(true)}
          className="w-8 h-8 flex items-center justify-center rounded-skeu bg-surface-raised shadow-skeu-embossed hover:shadow-skeu-raised transition-all"
          title="Settings"
        >
          <Settings size={15} className="text-muted" />
        </button>
        <button
          onClick={logout}
          className="w-8 h-8 flex items-center justify-center rounded-skeu bg-surface-raised shadow-skeu-embossed hover:shadow-skeu-raised transition-all"
          title="Logout"
        >
          <LogOut size={15} className="text-error" />
        </button>
      </div>

      {user?.is_superuser && (
        <AdminPanel isOpen={showAdmin} onClose={() => setShowAdmin(false)} />
      )}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
