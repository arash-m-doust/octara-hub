import { create } from 'zustand'
import { dmApi, type DMThread } from '@/api/dm'
import { extractResults } from '@/api/client'
import type { Message } from '@/api/messages'

interface DMState {
  threads: DMThread[]
  currentThread: DMThread | null
  messages: Message[]
  isLoading: boolean

  fetchThreads: () => Promise<void>
  setCurrentThread: (thread: DMThread | null) => void
  fetchMessages: (threadId: number) => Promise<void>
  sendMessage: (threadId: number, content: string) => Promise<void>
  createThread: (userIds: number[], name?: string) => Promise<DMThread>
  addMessage: (msg: Message) => void
}

export const useDMStore = create<DMState>((set, get) => ({
  threads: [],
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

  setCurrentThread: (thread) => {
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
    // Add message to local state immediately (don't rely on SSE)
    set((s) => {
      if (s.messages.some((m) => m.id === msg.id)) return s
      return { messages: [...s.messages, msg] }
    })
  },

  createThread: async (userIds, name) => {
    const thread = await dmApi.create(userIds, name)
    set((s) => {
      const exists = s.threads.find((t) => t.id === thread.id)
      return { threads: exists ? s.threads : [thread, ...s.threads] }
    })
    return thread
  },

  addMessage: (msg) => set((s) => {
    if (s.messages.some((m) => m.id === msg.id)) return s
    return { messages: [...s.messages, msg] }
  }),
}))
