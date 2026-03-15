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
      <div className="flex-1 flex items-center justify-center text-muted">
        Select a conversation
      </div>
    )
  }

  if (!currentWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">👋</div>
          <h2 className="text-lg font-semibold text-gray-700">Welcome to BexChat</h2>
          <p className="text-sm text-muted">Create or join a workspace to get started</p>
        </div>
      </div>
    )
  }

  if (!currentChannel) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted">
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
