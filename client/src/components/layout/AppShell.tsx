import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useDMStore } from '@/stores/dmStore'
import { useUIStore } from '@/stores/uiStore'
import { realtime } from '@/realtime/connection'
import { useAuthStore } from '@/stores/authStore'
import { useCallStore } from '@/stores/callStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { TopBar } from './TopBar'
import { StatusBar } from './StatusBar'
import { ChannelSidebar } from './ChannelSidebar'
import { MainPanel } from './MainPanel'
import { RightPanel } from './RightPanel'
import { CallOverlay } from '@/components/call/CallOverlay'
import { IncomingCallModal } from '@/components/call/IncomingCallModal'
import { ToastContainer } from '@/components/ui/Toast'
import { useAppShellHotkeys, useAppShellRealtime } from './useAppShellEffects'

export function AppShell() {
  const { user } = useAuthStore()
  const {
    fetchWorkspaces,
    fetchChannels,
    fetchCategories,
    fetchMembers,
    currentWorkspace,
  } = useWorkspaceStore()
  const {
    fetchThreads,
    fetchPlatformUsers,
    addMessage,
    currentThread,
    setThreadUnread,
    upsertThreadFromDmEvent,
  } = useDMStore()
  const { fetchNotifications, addNotification } = useNotificationStore()
  const {
    rightPanel,
    setRightPanel,
    view,
    isMobileMenuOpen,
    setMobileMenuOpen,
    leftSidebarWidth,
    rightPanelWidth,
    setLeftSidebarWidth,
    setRightPanelWidth,
  } = useUIStore()
  const {
    setIncomingCall, handleSignal, handleParticipantJoined,
    handleParticipantLeft, handleCallEnded,
  } = useCallStore()
  const resizeRef = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null)

  const startResize = (side: 'left' | 'right', event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startWidth = side === 'left' ? leftSidebarWidth : rightPanelWidth
    resizeRef.current = { side, startX: event.clientX, startWidth }
  }

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!resizeRef.current) return
      const { side, startX, startWidth } = resizeRef.current
      if (side === 'left') {
        const nextWidth = startWidth + (event.clientX - startX)
        setLeftSidebarWidth(nextWidth)
        return
      }
      const nextWidth = startWidth + (startX - event.clientX)
      setRightPanelWidth(nextWidth)
    }

    const onMouseUp = () => {
      resizeRef.current = null
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [setLeftSidebarWidth, setRightPanelWidth])

  useEffect(() => {
    if (!user) return
    // Initial hydration after authentication.
    fetchWorkspaces()
    fetchThreads()
    fetchPlatformUsers()
    fetchNotifications()
  }, [user?.id, fetchWorkspaces, fetchThreads, fetchPlatformUsers, fetchNotifications])

  useEffect(() => {
    if (!user || view !== 'dm') return
    // Defensive refresh when user enters DM view.
    fetchThreads()
    fetchPlatformUsers()
  }, [user?.id, view, fetchThreads, fetchPlatformUsers])

  useEffect(() => {
    // Realtime lifecycle follows auth lifecycle.
    if (user) { realtime.connect(); return () => realtime.disconnect() }
  }, [user])

  // Apply saved theme on mount
  useEffect(() => {
    if (user?.profile?.theme) {
      document.documentElement.setAttribute('data-theme', user.profile.theme)
    }
  }, [user?.profile?.theme])

  useAppShellHotkeys({ rightPanel, setRightPanel })

  useAppShellRealtime({
    userId: user?.id,
    view,
    currentThreadId: currentThread?.id,
    currentWorkspaceId: currentWorkspace?.id,
    setIncomingCall,
    handleSignal,
    handleParticipantJoined,
    handleParticipantLeft,
    handleCallEnded,
    fetchThreads,
    addMessage,
    setThreadUnread,
    upsertThreadFromDmEvent,
    fetchWorkspaces,
    fetchChannels,
    fetchCategories,
    fetchMembers,
    addNotification,
  })

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
      {/* Top Bar */}
      <TopBar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar backdrop */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-30"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Channel Sidebar - mobile overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-y-12 start-0 z-40 flex">
            <ChannelSidebar />
          </div>
        )}

        {/* Channel Sidebar - desktop */}
        <div className="hidden lg:flex lg:flex-shrink-0" style={{ width: `${leftSidebarWidth}px` }}>
          <ChannelSidebar width={leftSidebarWidth} />
        </div>
        <div
          className="hidden lg:block w-1 cursor-col-resize"
          style={{ backgroundColor: 'var(--color-border-groove)' }}
          onMouseDown={(event) => startResize('left', event)}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize left sidebar"
        />

        {/* Main Panel */}
        <MainPanel />

        {/* Right Panel */}
        {rightPanel && (
          <>
            <div
              className="hidden md:block w-1 cursor-col-resize"
              style={{ backgroundColor: 'var(--color-border-groove)' }}
              onMouseDown={(event) => startResize('right', event)}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize right panel"
            />
            <div className="hidden md:flex flex-shrink-0" style={{ width: `${rightPanelWidth}px` }}>
              <RightPanel width={rightPanelWidth} />
            </div>

            {/* Mobile: bottom sheet */}
            <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
              <div className="flex-1 bg-black/40" onClick={() => setRightPanel(null)} />
              <div
                className="rounded-t-xl overflow-hidden"
                style={{
                  background: 'var(--color-surface-plate)',
                  maxHeight: '75vh',
                  border: '1px solid var(--color-border)',
                  borderBottom: 'none',
                }}
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div
                    style={{
                      width: 40,
                      height: 4,
                      borderRadius: 2,
                      background: 'var(--color-border)',
                    }}
                  />
                </div>
                <div style={{ maxHeight: 'calc(75vh - 20px)', overflowY: 'auto' }}>
                  <RightPanel width={typeof window !== 'undefined' ? window.innerWidth : 360} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Call Overlay & Incoming Call */}
      <CallOverlay />
      <IncomingCallModal />
      <ToastContainer />
    </div>
  )
}
