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

export function AppShell() {
  const { user, logout } = useAuthStore()
  const { fetchWorkspaces } = useWorkspaceStore()
  const { rightPanel } = useUIStore()
  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])
  useEffect(() => {
    if (user) { realtime.connect(); return () => realtime.disconnect() }
  }, [user])

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
            className="p-1.5 rounded-skeu bg-surface-raised shadow-skeu-embossed hover:bg-white text-sm"
            title="Admin Panel"
          >
            ⚙
          </button>
        )}
        <button
          onClick={logout}
          className="p-1.5 rounded-skeu bg-surface-raised shadow-skeu-embossed hover:bg-white text-sm text-danger"
          title="Logout"
        >
          ⏻
        </button>
      </div>

      {user?.is_superuser && (
        <AdminPanel isOpen={showAdmin} onClose={() => setShowAdmin(false)} />
      )}
    </div>
  )
}
