import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useUIStore } from '@/stores/uiStore'
import { realtime } from '@/realtime/connection'
import { ServerRail } from './ServerRail'
import { ChannelSidebar } from './ChannelSidebar'
import { MainPanel } from './MainPanel'
import { RightPanel } from './RightPanel'

export function AppShell() {
  const { user, fetchMe } = useAuthStore()
  const { fetchWorkspaces, currentWorkspace } = useWorkspaceStore()
  const { rightPanel } = useUIStore()

  useEffect(() => {
    fetchMe()
    fetchWorkspaces()
  }, [fetchMe, fetchWorkspaces])

  useEffect(() => {
    if (user) {
      realtime.connect()
      return () => realtime.disconnect()
    }
  }, [user])

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Server Rail - 56px */}
      <ServerRail />

      {/* Channel Sidebar - 240px */}
      <ChannelSidebar />

      {/* Main Chat Panel - flex grow */}
      <MainPanel />

      {/* Right Panel - 260px, conditional */}
      {rightPanel && <RightPanel />}
    </div>
  )
}
