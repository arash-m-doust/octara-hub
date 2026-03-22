import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useUIStore } from '@/stores/uiStore'
import { realtime } from '@/realtime/connection'
import { useAuthStore } from '@/stores/authStore'
import { TopBar } from './TopBar'
import { StatusBar } from './StatusBar'
import { ChannelSidebar } from './ChannelSidebar'
import { MainPanel } from './MainPanel'
import { RightPanel } from './RightPanel'
import { AdminPanel } from '@/components/admin/AdminPanel'

export function AppShell() {
  const { user } = useAuthStore()
  const { fetchWorkspaces } = useWorkspaceStore()
  const { rightPanel, isMobileMenuOpen, setMobileMenuOpen } = useUIStore()
  const [showAdmin, setShowAdmin] = useState(false)

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
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
      {/* Top Bar */}
      <TopBar onAdminClick={user?.is_superuser ? () => setShowAdmin(true) : undefined} />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar backdrop */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-30"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Channel Sidebar - desktop: inline, mobile: overlay */}
        <div className={`
          lg:relative lg:flex lg:flex-shrink-0
          ${isMobileMenuOpen ? 'fixed inset-y-12 start-0 z-40 flex' : 'hidden lg:flex'}
        `}>
          <ChannelSidebar />
        </div>

        {/* Main Panel */}
        <MainPanel />

        {/* Right Panel */}
        {rightPanel && (
          <div className="hidden md:flex flex-shrink-0">
            <RightPanel />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Admin Panel Modal */}
      {user?.is_superuser && (
        <AdminPanel isOpen={showAdmin} onClose={() => setShowAdmin(false)} />
      )}
    </div>
  )
}
