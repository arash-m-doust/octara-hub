import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useUIStore } from '@/stores/uiStore'
import { useDMStore } from '@/stores/dmStore'
import { ChatView } from '@/components/chat/ChatView'
import { DMChatView } from '@/components/dm/DMChatView'

export function MainPanel() {
  const { currentChannel, currentWorkspace } = useWorkspaceStore()
  const { view } = useUIStore()
  const { currentThread } = useDMStore()

  if (view === 'dm') {
    if (currentThread) {
      return (
        <div className="flex-1 flex flex-col min-w-0">
          <DMChatView />
        </div>
      )
    }
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
        Select a conversation
      </div>
    )
  }

  if (!currentWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full ind-recess flex items-center justify-center">
            <img src="/octara-brand-logo.svg" alt="Octara Hub" className="w-10 h-10 rounded-md" />
          </div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Welcome to Octara Hub</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Create or join a workspace to get started</p>
        </div>
      </div>
    )
  }

  if (!currentChannel) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
        Select a channel to start chatting
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ChatView />
    </div>
  )
}
