import { create } from 'zustand'
import { dmApi, type DMThread } from '@/api/dm'
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
    const threads = await dmApi.threads()
    set({ threads })
  },

  setCurrentThread: (thread) => {
    set({ currentThread: thread, messages: [] })
    if (thread) get().fetchMessages(thread.id)
  },

  fetchMessages: async (threadId) => {
    set({ isLoading: true })
    const res = await dmApi.messages(threadId)
    set({ messages: res.results.reverse(), isLoading: false })
  },

  sendMessage: async (threadId, content) => {
    await dmApi.sendMessage(threadId, { content })
  },

  createThread: async (userIds, name) => {
    const thread = await dmApi.create(userIds, name)
    set((s) => {
      const exists = s.threads.find((t) => t.id === thread.id)
      return { threads: exists ? s.threads : [thread, ...s.threads] }
    })
    return thread
  },

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
}))
