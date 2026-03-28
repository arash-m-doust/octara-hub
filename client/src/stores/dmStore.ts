import { create } from 'zustand'
import { dmApi, type DMThread } from '@/api/dm'
import { extractResults } from '@/api/client'
import type { Message } from '@/api/messages'
import { authApi, type User, type PlatformUser } from '@/api/auth'

interface DMState {
  threads: DMThread[]
  platformUsers: PlatformUser[]
  currentThread: DMThread | null
  messages: Message[]
  isLoading: boolean

  fetchThreads: () => Promise<void>
  fetchPlatformUsers: (q?: string) => Promise<void>
  setCurrentThread: (thread: DMThread | null) => void
  fetchMessages: (threadId: number) => Promise<void>
  sendMessage: (threadId: number, content: string) => Promise<void>
  createThread: (userIds: number[], name?: string) => Promise<DMThread>
  addMessage: (msg: Message) => void
  syncUserSnapshot: (user: User) => void
  reset: () => void
}

export const useDMStore = create<DMState>((set, get) => ({
  threads: [],
  platformUsers: [],
  currentThread: null,
  messages: [],
  isLoading: false,

  fetchThreads: async () => {
    try {
      const res = await dmApi.threads()
      set({ threads: extractResults(res) })
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
    // Changing thread resets message pane and triggers fresh history load.
    set({ currentThread: thread, messages: [] })
    if (thread) get().fetchMessages(thread.id)
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

  sendMessage: async (threadId, content) => {
    const msg = await dmApi.sendMessage(threadId, { content })
    // Optimistic append avoids visible latency while SSE catches up.
    set((s) => {
      if (s.messages.some((m) => m.id === msg.id)) return s
      return { messages: [...s.messages, msg] }
    })
  },

  createThread: async (userIds, name) => {
    const thread = await dmApi.create(userIds, name)
    set((s) => {
      // API may return an existing 1:1 thread; avoid duplicate insertion.
      const exists = s.threads.find((t) => t.id === thread.id)
      return { threads: exists ? s.threads : [thread, ...s.threads] }
    })
    return thread
  },

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
  }),
}))
