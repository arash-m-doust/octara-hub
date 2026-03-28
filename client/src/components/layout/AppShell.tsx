import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useDMStore } from '@/stores/dmStore'
import { useUIStore } from '@/stores/uiStore'
import { realtime } from '@/realtime/connection'
import { useAuthStore } from '@/stores/authStore'
import { useCallStore } from '@/stores/callStore'
import type { Message } from '@/api/messages'
import { TopBar } from './TopBar'
import { StatusBar } from './StatusBar'
import { ChannelSidebar } from './ChannelSidebar'
import { MainPanel } from './MainPanel'
import { RightPanel } from './RightPanel'
import { CallOverlay } from '@/components/call/CallOverlay'
import { IncomingCallModal } from '@/components/call/IncomingCallModal'

export function AppShell() {
  const { user } = useAuthStore()
  const { fetchWorkspaces } = useWorkspaceStore()
  const { fetchThreads, fetchPlatformUsers, currentThread, addMessage } = useDMStore()
  const {
    rightPanel,
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
  }, [user?.id, fetchWorkspaces, fetchThreads, fetchPlatformUsers])

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

  // Listen for call-related SSE events
  useEffect(() => {
    const unsubs = [
      realtime.on('call.incoming', (data: unknown) => {
        const { call } = data as { call: import('@/api/calls').CallSession }
        setIncomingCall(call)
      }),
      realtime.on('call.started', (data: unknown) => {
        // Another user started a call in our channel - show as incoming
        const { call } = data as { call: import('@/api/calls').CallSession }
        if (call.initiator.id !== user?.id) {
          setIncomingCall(call)
        }
      }),
      realtime.on('call.signal', (data: unknown) => {
        handleSignal(data as Parameters<typeof handleSignal>[0])
      }),
      realtime.on('call.participant_joined', (data: unknown) => {
        handleParticipantJoined(data as Parameters<typeof handleParticipantJoined>[0])
      }),
      realtime.on('call.participant_left', (data: unknown) => {
        handleParticipantLeft(data as Parameters<typeof handleParticipantLeft>[0])
      }),
      realtime.on('call.ended', (data: unknown) => {
        handleCallEnded(data as Parameters<typeof handleCallEnded>[0])
      }),
      realtime.on('call.declined', (data: unknown) => {
        handleCallEnded(data as Parameters<typeof handleCallEnded>[0])
      }),
      realtime.on('dm.message.created', (data: unknown) => {
        const { message } = data as { message: Message }
        // Always refresh thread list so newly-created 1:1 thread appears.
        fetchThreads()
        if (currentThread && message.dm_thread === currentThread.id) {
          addMessage(message)
        }
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [user?.id, currentThread?.id, setIncomingCall, handleSignal, handleParticipantJoined, handleParticipantLeft, handleCallEnded, fetchThreads, addMessage])

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
          </>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Call Overlay & Incoming Call */}
      <CallOverlay />
      <IncomingCallModal />
    </div>
  )
}
