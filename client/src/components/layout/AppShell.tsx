import { useEffect } from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useUIStore } from '@/stores/uiStore'
import { realtime } from '@/realtime/connection'
import { useAuthStore } from '@/stores/authStore'
import { useCallStore } from '@/stores/callStore'
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
  const { rightPanel, isMobileMenuOpen, setMobileMenuOpen } = useUIStore()
  const {
    setIncomingCall, handleSignal, handleParticipantJoined,
    handleParticipantLeft, handleCallEnded,
  } = useCallStore()

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
    ]
    return () => unsubs.forEach((u) => u())
  }, [user?.id, setIncomingCall, handleSignal, handleParticipantJoined, handleParticipantLeft, handleCallEnded])

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

      {/* Call Overlay & Incoming Call */}
      <CallOverlay />
      <IncomingCallModal />
    </div>
  )
}
