import { create } from 'zustand'
import { dmApi, type DMThread, type DMPinnedMessage } from '@/api/dm'
import { extractResults } from '@/api/client'
import type { Message } from '@/api/messages'
import { authApi, type User, type PlatformUser } from '@/api/auth'
import { toast } from '@/components/ui/Toast'

interface DMState {
  threads: DMThread[]
  platformUsers: PlatformUser[]
  currentThread: DMThread | null
  messages: Message[]
  isLoading: boolean
  replyTo: Message | null
  pinnedMessages: DMPinnedMessage[]
  currentPinIndex: number

  fetchThreads: () => Promise<void>
  fetchPlatformUsers: (q?: string) => Promise<void>
  setCurrentThread: (thread: DMThread | null) => void
  setThreadUnread: (threadId: number, unreadCount: number) => void
  upsertThreadFromDmEvent: (threadId: number, message: Message, isActiveThread: boolean) => boolean
  markThreadRead: (threadId: number) => Promise<void>
  fetchMessages: (threadId: number) => Promise<void>
  sendMessage: (threadId: number, content: string, replyTo?: number) => Promise<void>
  editMessage: (threadId: number, messageId: number, content: string) => Promise<void>
  deleteMessage: (threadId: number, messageId: number) => Promise<void>
  removeMessage: (messageId: number) => void
  pinMessage: (threadId: number, messageId: number) => Promise<void>
  unpinMessage: (threadId: number, messageId: number) => Promise<void>
  fetchPinnedMessages: (threadId: number) => Promise<void>
  cyclePinIndex: (direction: 'next' | 'prev') => void
  createThread: (userIds: number[], name?: string) => Promise<DMThread>
  setReplyTo: (msg: Message | null) => void
  addMessage: (msg: Message) => void
  syncUserSnapshot: (user: User) => void
  reset: () => void
}

function patchMessageInList(list: Message[], messageId: number, updater: (msg: Message) => Message): Message[] {
  return list.map((message) => (message.id === messageId ? updater(message) : message))
}

export const useDMStore = create<DMState>((set, get) => ({
  threads: [],
  platformUsers: [],
  currentThread: null,
  messages: [],
  isLoading: false,
  replyTo: null,
  pinnedMessages: [],
  currentPinIndex: 0,

  fetchThreads: async () => {
    try {
      const res = await dmApi.threads()
      const list = extractResults(res)
      set((s) => ({
        threads: list,
        currentThread: s.currentThread
          ? (list.find((thread) => thread.id === s.currentThread!.id) ?? s.currentThread)
          : null,
      }))
    } catch (err) {
      console.error('Failed to fetch DM threads:', err)
    }
  },

  fetchPlatformUsers: async (q) => {
    try {
      const res = await authApi.users(q)
      set({ platformUsers: extractResults(res) })
    } catch (err) {
      console.error('Failed to fetch platform users:', err)
    }
  },

  setCurrentThread: (thread) => {
    if (!thread) {
      set({
        currentThread: null,
        messages: [],
        replyTo: null,
        pinnedMessages: [],
        currentPinIndex: 0,
      })
      return
    }
    set((s) => ({
      currentThread: { ...thread, unread_count: 0 },
      threads: s.threads.map((t) => (t.id === thread.id ? { ...t, unread_count: 0 } : t)),
      messages: [],
      replyTo: null,
      pinnedMessages: [],
      currentPinIndex: 0,
    }))
    void get().fetchMessages(thread.id)
    void get().fetchPinnedMessages(thread.id)
  },

  setThreadUnread: (threadId, unreadCount) => set((s) => ({
    threads: s.threads.map((t) => (
      t.id === threadId ? { ...t, unread_count: Math.max(0, unreadCount) } : t
    )),
    currentThread: s.currentThread?.id === threadId
      ? { ...s.currentThread, unread_count: Math.max(0, unreadCount) }
      : s.currentThread,
  })),

  upsertThreadFromDmEvent: (threadId, message, isActiveThread) => {
    let found = false
    set((s) => {
      const idx = s.threads.findIndex((thread) => thread.id === threadId)
      if (idx === -1) {
        return s
      }

      found = true
      const existing = s.threads[idx]
      const nextUnread = isActiveThread ? 0 : (existing.unread_count || 0) + 1
      const updatedThread = {
        ...existing,
        unread_count: nextUnread,
        last_message: message,
        updated_at: message.created_at,
      }
      const nextThreads = [updatedThread, ...s.threads.filter((thread) => thread.id !== threadId)]

      return {
        threads: nextThreads,
        currentThread: s.currentThread?.id === threadId
          ? {
              ...s.currentThread,
              unread_count: nextUnread,
              last_message: message,
              updated_at: message.created_at,
            }
          : s.currentThread,
      }
    })
    return found
  },

  markThreadRead: async (threadId) => {
    get().setThreadUnread(threadId, 0)
    try {
      await dmApi.read(threadId)
    } catch (err) {
      console.error('Failed to mark DM thread as read:', err)
    }
  },

  fetchMessages: async (threadId) => {
    set({ isLoading: true })
    try {
      const res = await dmApi.messages(threadId)
      set({ messages: res.results.reverse(), isLoading: false })
    } catch (err) {
      console.error('Failed to fetch DM messages:', err)
      set({ isLoading: false })
    }
  },

  sendMessage: async (threadId, content, replyTo) => {
    try {
      const msg = await dmApi.sendMessage(threadId, {
        content,
        ...(replyTo ? { reply_to: replyTo } : {}),
      })
      set((s) => {
        const nextMessages = s.messages.some((m) => m.id === msg.id)
          ? s.messages
          : [...s.messages, msg]
        return {
          messages: nextMessages,
          replyTo: null,
          threads: s.threads.map((thread) => (
            thread.id === threadId
              ? { ...thread, last_message: msg, updated_at: msg.created_at }
              : thread
          )),
          currentThread: s.currentThread?.id === threadId
            ? { ...s.currentThread, last_message: msg, updated_at: msg.created_at }
            : s.currentThread,
        }
      })
    } catch (err) {
      toast.error('Message failed to send')
      throw err
    }
  },

  editMessage: async (threadId, messageId, content) => {
    const updated = await dmApi.editMessage(threadId, messageId, content)
    set((s) => ({
      messages: patchMessageInList(s.messages, messageId, () => updated),
      pinnedMessages: s.pinnedMessages.map((pin) => (
        pin.message.id === messageId ? { ...pin, message: updated } : pin
      )),
      replyTo: s.replyTo?.id === messageId ? updated : s.replyTo,
    }))
  },

  deleteMessage: async (threadId, messageId) => {
    await dmApi.deleteMessage(threadId, messageId)
    get().removeMessage(messageId)
  },

  removeMessage: (messageId) => set((s) => ({
    messages: s.messages.filter((message) => message.id !== messageId),
    pinnedMessages: s.pinnedMessages.filter((pin) => pin.message.id !== messageId),
    replyTo: s.replyTo?.id === messageId ? null : s.replyTo,
    currentPinIndex: s.currentPinIndex >= Math.max(0, s.pinnedMessages.length - 1)
      ? Math.max(0, s.pinnedMessages.length - 2)
      : s.currentPinIndex,
  })),

  pinMessage: async (threadId, messageId) => {
    await dmApi.pinMessage(threadId, messageId)
    await get().fetchPinnedMessages(threadId)
  },

  unpinMessage: async (threadId, messageId) => {
    await dmApi.unpinMessage(threadId, messageId)
    await get().fetchPinnedMessages(threadId)
  },

  fetchPinnedMessages: async (threadId) => {
    try {
      const res = await dmApi.pinnedMessages(threadId)
      const items = extractResults(res as unknown as DMPinnedMessage[])
      set({
        pinnedMessages: Array.isArray(items) ? items : [],
        currentPinIndex: 0,
      })
    } catch {
      set({
        pinnedMessages: [],
        currentPinIndex: 0,
      })
    }
  },

  cyclePinIndex: (direction) => {
    const { pinnedMessages, currentPinIndex } = get()
    if (pinnedMessages.length === 0) return
    if (direction === 'next') {
      set({ currentPinIndex: (currentPinIndex + 1) % pinnedMessages.length })
      return
    }
    set({ currentPinIndex: (currentPinIndex - 1 + pinnedMessages.length) % pinnedMessages.length })
  },

  createThread: async (userIds, name) => {
    const thread = await dmApi.create(userIds, name)
    set((s) => {
      const exists = s.threads.find((t) => t.id === thread.id)
      return { threads: exists ? s.threads : [thread, ...s.threads] }
    })
    return thread
  },

  setReplyTo: (msg) => set({ replyTo: msg }),

  addMessage: (msg) => set((s) => {
    if (s.messages.some((m) => m.id === msg.id)) return s
    return { messages: [...s.messages, msg] }
  }),

  syncUserSnapshot: (user) => set((s) => ({
    threads: s.threads.map((thread) => ({
      ...thread,
      participants: thread.participants.map((participant) => (
        participant.user.id === user.id
          ? { ...participant, user: { ...participant.user, ...user, profile: { ...participant.user.profile, ...user.profile } } }
          : participant
      )),
      last_message: thread.last_message
        ? {
            ...thread.last_message,
            user: thread.last_message.user.id === user.id
              ? { ...thread.last_message.user, ...user, profile: { ...thread.last_message.user.profile, ...user.profile } }
              : thread.last_message.user,
          }
        : null,
    })),
    currentThread: s.currentThread
      ? {
          ...s.currentThread,
          participants: s.currentThread.participants.map((participant) => (
            participant.user.id === user.id
              ? { ...participant, user: { ...participant.user, ...user, profile: { ...participant.user.profile, ...user.profile } } }
              : participant
          )),
          last_message: s.currentThread.last_message
            ? {
                ...s.currentThread.last_message,
                user: s.currentThread.last_message.user.id === user.id
                  ? { ...s.currentThread.last_message.user, ...user, profile: { ...s.currentThread.last_message.user.profile, ...user.profile } }
                  : s.currentThread.last_message.user,
              }
            : null,
        }
      : null,
    messages: s.messages.map((message) => ({
      ...message,
      user: message.user.id === user.id
        ? { ...message.user, ...user, profile: { ...message.user.profile, ...user.profile } }
        : message.user,
      reply_to_preview: message.reply_to_preview
        ? {
            ...message.reply_to_preview,
            user: message.reply_to_preview.user.id === user.id
              ? { ...message.reply_to_preview.user, ...user, profile: { ...message.reply_to_preview.user.profile, ...user.profile } }
              : message.reply_to_preview.user,
          }
        : null,
    })),
    pinnedMessages: s.pinnedMessages.map((pin) => ({
      ...pin,
      message: {
        ...pin.message,
        user: pin.message.user.id === user.id
          ? { ...pin.message.user, ...user, profile: { ...pin.message.user.profile, ...user.profile } }
          : pin.message.user,
      },
    })),
    replyTo: s.replyTo
      ? {
          ...s.replyTo,
          user: s.replyTo.user.id === user.id
            ? { ...s.replyTo.user, ...user, profile: { ...s.replyTo.user.profile, ...user.profile } }
            : s.replyTo.user,
        }
      : null,
    platformUsers: s.platformUsers.map((platformUser) => (
      platformUser.id === user.id
        ? {
            ...platformUser,
            username: user.username,
            profile: {
              ...platformUser.profile,
              display_name: user.profile?.display_name || platformUser.profile.display_name,
              avatar_path: user.profile?.avatar_path || platformUser.profile.avatar_path,
              status: user.profile?.status || platformUser.profile.status,
            },
          }
        : platformUser
    )),
  })),

  reset: () => set({
    threads: [],
    platformUsers: [],
    currentThread: null,
    messages: [],
    isLoading: false,
    replyTo: null,
    pinnedMessages: [],
    currentPinIndex: 0,
  }),
}))

