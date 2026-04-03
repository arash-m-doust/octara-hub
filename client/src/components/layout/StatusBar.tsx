import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useUIStore } from '@/stores/uiStore'
import { useDMStore } from '@/stores/dmStore'
import { useAuthStore } from '@/stores/authStore'
import { realtime } from '@/realtime/connection'
import { Wifi, Hash, Users } from 'lucide-react'

export function StatusBar() {
  const { currentWorkspace, currentChannel, members } = useWorkspaceStore()
  const { view } = useUIStore()
  const { currentThread } = useDMStore()
  const { user } = useAuthStore()
  const [connState, setConnState] = useState(realtime.getState())

  useEffect(() => {
    const unsubscribe = realtime.onStateChange(setConnState)
    return () => {
      unsubscribe()
    }
  }, [])

  const stateConfig = {
    connected: { color: 'var(--color-led-online)', label: 'Connected', pulse: false },
    reconnecting: { color: 'var(--color-led-idle)', label: 'Reconnecting...', pulse: true },
    disconnected: { color: 'var(--color-led-dnd)', label: 'Disconnected', pulse: false },
  } as const
  const cfg = stateConfig[connState]

  const channelName = view === 'dm'
    ? (currentThread ? 'Direct Message' : 'DMs')
    : currentChannel?.name || currentWorkspace?.name || 'Octara Hub'

  return (
    <div
      className="h-6 flex-shrink-0 hidden sm:flex items-center px-3 gap-3 text-[10px] border-t"
      style={{
        background: 'linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-inset) 100%)',
        borderColor: 'var(--color-border-groove)',
        color: 'var(--color-text-muted)',
      }}
    >
      {/* Connection LED */}
      <div className="flex items-center gap-1.5">
        <span
          className={`ind-led ${cfg.pulse ? 'ind-led-pulse' : 'ind-led-on'}`}
          style={{ backgroundColor: cfg.color, width: '6px', height: '6px' }}
        />
        <Wifi size={10} />
        <span>{cfg.label}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-3" style={{ backgroundColor: 'var(--color-border)' }} />

      {/* Current location */}
      <div className="flex items-center gap-1">
        <Hash size={10} />
        <span>{channelName}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Member count */}
      {view === 'workspace' && currentChannel && members.length > 0 && (
        <div className="flex items-center gap-1">
          <Users size={10} />
          <span>{members.length}</span>
        </div>
      )}

      {/* User */}
      <span>{user?.profile?.display_name || user?.username}</span>
    </div>
  )
}
