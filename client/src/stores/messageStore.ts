import { create } from 'zustand'
import { messageApi, type Message } from '@/api/messages'

interface MessageState {
  messages: Message[]
  isLoading: boolean
  hasMore: boolean
  nextCursor: string | null
  replyTo: Message | null

  fetchMessages: (channelId: number) => Promise<void>
  loadMore: (channelId: number) => Promise<void>
  sendMessage: (channelId: number, content: string, replyTo?: number) => Promise<void>
  editMessage: (channelId: number, messageId: number, content: string) => Promise<void>
  deleteMessage: (channelId: number, messageId: number) => Promise<void>
  addReaction: (channelId: number, messageId: number, emoji: string) => Promise<void>
  removeReaction: (channelId: number, messageId: number, emoji: string) => Promise<void>
  setReplyTo: (msg: Message | null) => void
  addMessage: (msg: Message) => void
  clear: () => void
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  isLoading: false,
  hasMore: false,
  nextCursor: null,
  replyTo: null,

  fetchMessages: async (channelId) => {
    set({ isLoading: true, messages: [], hasMore: false, nextCursor: null })
    const res = await messageApi.list(channelId)
    set({
      messages: res.results.reverse(),
      isLoading: false,
      hasMore: !!res.next,
      nextCursor: res.next ? new URL(res.next, location.origin).searchParams.get('cursor') : null,
    })
  },

  loadMore: async (channelId) => {
    const { nextCursor, isLoading } = get()
    if (!nextCursor || isLoading) return
    set({ isLoading: true })
    const res = await messageApi.list(channelId, nextCursor)
    set((s) => ({
      messages: [...res.results.reverse(), ...s.messages],
      isLoading: false,
      hasMore: !!res.next,
      nextCursor: res.next ? new URL(res.next, location.origin).searchParams.get('cursor') : null,
    }))
  },

  sendMessage: async (channelId, content, replyTo) => {
    await messageApi.send(channelId, { content, reply_to: replyTo })
    set({ replyTo: null })
  },

  editMessage: async (channelId, messageId, content) => {
    const updated = await messageApi.edit(channelId, messageId, content)
    set((s) => ({
      messages: s.messages.map((m) => (m.id === messageId ? updated : m)),
    }))
  },

  deleteMessage: async (channelId, messageId) => {
    await messageApi.delete(channelId, messageId)
    set((s) => ({
      messages: s.messages.filter((m) => m.id !== messageId),
    }))
  },

  addReaction: async (channelId, messageId, emoji) => {
    await messageApi.addReaction(channelId, messageId, emoji)
  },

  removeReaction: async (channelId, messageId, emoji) => {
    await messageApi.removeReaction(channelId, messageId, emoji)
  },

  setReplyTo: (msg) => set({ replyTo: msg }),

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  clear: () => set({ messages: [], hasMore: false, nextCursor: null, replyTo: null }),
}))
