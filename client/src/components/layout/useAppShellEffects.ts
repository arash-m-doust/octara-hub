import { useEffect } from 'react'
import { realtime } from '@/realtime/connection'
import type { Message } from '@/api/messages'

interface HotkeyOptions {
  rightPanel: 'members' | 'files' | 'pinned' | 'search' | null
  setRightPanel: (panel: 'members' | 'files' | 'pinned' | 'search' | null) => void
}

interface RealtimeOptions {
  userId?: number
  view: 'workspace' | 'dm'
  currentThreadId?: number
  currentWorkspaceId?: number
  setIncomingCall: (call: import('@/api/calls').CallSession) => void
  handleSignal: (...args: any[]) => void
  handleParticipantJoined: (...args: any[]) => void
  handleParticipantLeft: (...args: any[]) => void
  handleCallEnded: (...args: any[]) => void
  fetchThreads: () => Promise<void>
  addMessage: (message: Message) => void
  setThreadUnread: (threadId: number, unreadCount: number) => void
  upsertThreadFromDmEvent: (threadId: number, message: Message, isActiveThread: boolean) => boolean
  fetchWorkspaces: () => Promise<void>
  fetchChannels: (workspaceId: number) => Promise<void>
  fetchCategories: (workspaceId: number) => Promise<void>
  fetchMembers: (workspaceId: number) => Promise<void>
  addNotification: (notification: import('@/stores/notificationStore').NotificationItem) => void
}

export function useAppShellHotkeys({ rightPanel, setRightPanel }: HotkeyOptions) {
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
    }

    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [rightPanel, setRightPanel])
}

export function useAppShellRealtime({
  userId,
  view,
  currentThreadId,
  currentWorkspaceId,
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
}: RealtimeOptions) {
  useEffect(() => {
    const unsubs = [
      realtime.on('call.incoming', (data: unknown) => {
        const { call } = data as { call: import('@/api/calls').CallSession }
        setIncomingCall(call)
      }),
      realtime.on('call.started', (data: unknown) => {
        const { call } = data as { call: import('@/api/calls').CallSession }
        if (call.initiator.id !== userId) {
          setIncomingCall(call)
        }
      }),
      realtime.on('call.signal', (data: unknown) => {
        handleSignal(data)
      }),
      realtime.on('call.participant_joined', (data: unknown) => {
        handleParticipantJoined(data)
      }),
      realtime.on('call.participant_left', (data: unknown) => {
        handleParticipantLeft(data)
      }),
      realtime.on('call.ended', (data: unknown) => {
        handleCallEnded(data)
      }),
      realtime.on('call.declined', (data: unknown) => {
        handleCallEnded(data)
      }),
      realtime.on('dm.message.created', (data: unknown) => {
        const { message, thread_id } = data as { message: Message; thread_id?: number }
        const threadId = thread_id ?? message.dm_thread ?? 0
        if (!threadId) return

        const isActiveDmThread = view === 'dm' && currentThreadId === threadId
        if (isActiveDmThread) {
          addMessage(message)
          setThreadUnread(threadId, 0)
        }

        const knownThread = upsertThreadFromDmEvent(threadId, message, isActiveDmThread)
        if (!knownThread) {
          void fetchThreads()
        }
      }),
      realtime.on('workspace.created', () => {
        void fetchWorkspaces()
      }),
      realtime.on('workspace.invited', () => {
        void fetchWorkspaces()
        realtime.connect()
      }),
      realtime.on('workspace.member.added', (data: unknown) => {
        const { workspace_id } = data as { workspace_id: number }
        void fetchWorkspaces()
        if (currentWorkspaceId === workspace_id) {
          void fetchMembers(workspace_id)
        }
      }),
      realtime.on('category.created', (data: unknown) => {
        const { workspace_id } = data as { workspace_id: number }
        if (currentWorkspaceId === workspace_id) {
          void fetchCategories(workspace_id)
        }
      }),
      realtime.on('channel.created', (data: unknown) => {
        const { workspace_id } = data as { workspace_id: number }
        if (currentWorkspaceId === workspace_id) {
          void fetchChannels(workspace_id)
        }
      }),
      realtime.on('notification', (data: unknown) => {
        const { notification } = data as { notification: import('@/stores/notificationStore').NotificationItem }
        addNotification(notification)
      }),
    ]

    return () => unsubs.forEach((unsub) => unsub())
  }, [
    userId,
    view,
    currentThreadId,
    currentWorkspaceId,
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
  ])
}
