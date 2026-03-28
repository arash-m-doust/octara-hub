import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useUIStore } from '@/stores/uiStore'
import { useDMStore } from '@/stores/dmStore'
import { useAuthStore } from '@/stores/authStore'
import { Wifi, Hash, Users } from 'lucide-react'

export function StatusBar() {
  const { currentWorkspace, currentChannel, members } = useWorkspaceStore()
  const { view } = useUIStore()
  const { currentThread } = useDMStore()
  const { user } = useAuthStore()

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
          className="ind-led ind-led-on"
          style={{ backgroundColor: 'var(--color-led-online)', width: '6px', height: '6px' }}
        />
        <Wifi size={10} />
        <span>Connected</span>
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
