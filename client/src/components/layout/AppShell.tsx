import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useDMStore } from '@/stores/dmStore'
import { useUIStore } from '@/stores/uiStore'
import { realtime } from '@/realtime/connection'
import { useAuthStore } from '@/stores/authStore'
import { useCallStore } from '@/stores/callStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { toast } from '@/components/ui/Toast'
import type { Message } from '@/api/messages'
import { TopBar } from './TopBar'
import { StatusBar } from './StatusBar'
import { ChannelSidebar } from './ChannelSidebar'
import { MainPanel } from './MainPanel'
import { RightPanel } from './RightPanel'
import { CallOverlay } from '@/components/call/CallOverlay'
import { IncomingCallModal } from '@/components/call/IncomingCallModal'
import { ToastContainer } from '@/components/ui/Toast'

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
    currentThread,
    addMessage,
    setThreadUnread,
    incrementThreadUnread,
    markThreadRead,
    fetchMessages,
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

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.includes('Mac')
      const modifier = isMac ? e.metaKey : e.ctrlKey

      if (modifier && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setRightPanel('search')
        setTimeout(() => {
          const searchInput = document.querySelector<HTMLInputElement>('[placeholder=\"Search messages...\"]')
          searchInput?.focus()
        }, 50)
      }

      if (e.key === 'Escape' && rightPanel) {
        setRightPanel(null)
      }

      if (modifier && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        if (view === 'workspace') {
          void fetchWorkspaces()
          if (currentWorkspace) {
            void fetchChannels(currentWorkspace.id)
            void fetchCategories(currentWorkspace.id)
            void fetchMembers(currentWorkspace.id)
          }
        } else {
          void fetchThreads()
          void fetchPlatformUsers()
          if (currentThread) {
            void fetchMessages(currentThread.id)
          }
        }
        void fetchNotifications()
        toast.info('Page data refreshed')
      }
    }

    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [
    rightPanel,
    view,
    currentWorkspace?.id,
    currentThread?.id,
    setRightPanel,
    fetchWorkspaces,
    fetchChannels,
    fetchCategories,
    fetchMembers,
    fetchThreads,
    fetchPlatformUsers,
    fetchMessages,
    fetchNotifications,
  ])

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
        const { message, thread_id } = data as { message: Message; thread_id?: number }
        const threadId = thread_id ?? message.dm_thread ?? 0
        const isActiveDmThread = view === 'dm' && !!currentThread && threadId === currentThread.id
        if (isActiveDmThread) {
          addMessage(message)
          setThreadUnread(threadId, 0)
          void markThreadRead(threadId)
        } else if (threadId) {
          incrementThreadUnread(threadId)
        }
        // Always refresh thread list so newly-created 1:1 thread appears.
        void fetchThreads()
      }),
      realtime.on('workspace.created', () => {
        fetchWorkspaces()
      }),
      realtime.on('workspace.invited', () => {
        fetchWorkspaces()
        // Refresh subscriptions so workspace_{id} channels are picked up immediately.
        realtime.connect()
      }),
      realtime.on('workspace.member.added', (data: unknown) => {
        const { workspace_id } = data as { workspace_id: number }
        fetchWorkspaces()
        if (currentWorkspace?.id === workspace_id) {
          fetchMembers(workspace_id)
        }
      }),
      realtime.on('category.created', (data: unknown) => {
        const { workspace_id } = data as { workspace_id: number }
        if (currentWorkspace?.id === workspace_id) {
          fetchCategories(workspace_id)
        }
      }),
      realtime.on('channel.created', (data: unknown) => {
        const { workspace_id } = data as { workspace_id: number }
        if (currentWorkspace?.id === workspace_id) {
          fetchChannels(workspace_id)
        }
      }),
      realtime.on('notification', (data: unknown) => {
        const { notification } = data as { notification: import('@/stores/notificationStore').NotificationItem }
        addNotification(notification)
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [
    user?.id,
    view,
    currentThread?.id,
    currentWorkspace?.id,
    setIncomingCall,
    handleSignal,
    handleParticipantJoined,
    handleParticipantLeft,
    handleCallEnded,
    fetchThreads,
    fetchMessages,
    addMessage,
    addNotification,
    setThreadUnread,
    incrementThreadUnread,
    markThreadRead,
    fetchWorkspaces,
    fetchChannels,
    fetchCategories,
    fetchMembers,
  ])

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
