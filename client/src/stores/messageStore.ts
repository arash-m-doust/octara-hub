import { create } from 'zustand'
import { messageApi, type Message } from '@/api/messages'
import { extractResults } from '@/api/client'
import type { User } from '@/api/auth'

export interface PinnedMessage {
  id: number
  message: Message
  pinned_by?: number
  created_at: string
}

interface MessageState {
  messages: Message[]
  isLoading: boolean
  hasMore: boolean
  nextCursor: string | null
  replyTo: Message | null
  pinnedMessages: PinnedMessage[]
  currentPinIndex: number

  fetchMessages: (channelId: number) => Promise<void>
  loadMore: (channelId: number) => Promise<void>
  sendMessage: (channelId: number, content: string, replyTo?: number) => Promise<void>
  editMessage: (channelId: number, messageId: number, content: string) => Promise<void>
  deleteMessage: (channelId: number, messageId: number) => Promise<void>
  addReaction: (channelId: number, messageId: number, emoji: string) => Promise<void>
  removeReaction: (channelId: number, messageId: number, emoji: string) => Promise<void>
  pinMessage: (channelId: number, messageId: number) => Promise<void>
  unpinMessage: (channelId: number, messageId: number) => Promise<void>
  fetchPinnedMessages: (channelId: number) => Promise<void>
  cyclePinIndex: (direction: 'next' | 'prev') => void
  setReplyTo: (msg: Message | null) => void
  addMessage: (msg: Message) => void
  syncUserSnapshot: (user: User) => void
  reset: () => void
  clear: () => void
}

function extractCursor(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url, location.origin).searchParams.get('cursor')
  } catch {
    return null
  }
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  isLoading: false,
  hasMore: false,
  nextCursor: null,
  replyTo: null,
  pinnedMessages: [],
  currentPinIndex: 0,

  fetchMessages: async (channelId) => {
    set({ isLoading: true, messages: [], hasMore: false, nextCursor: null })
    try {
      const res = await messageApi.list(channelId)
      set({
        messages: res.results.reverse(),
        isLoading: false,
        hasMore: !!res.next,
        nextCursor: extractCursor(res.next),
      })
    } catch (err) {
      console.error('Failed to fetch messages:', err)
      set({ isLoading: false })
    }
  },

  loadMore: async (channelId) => {
    const { nextCursor, isLoading } = get()
    if (!nextCursor || isLoading) return
    set({ isLoading: true })
    try {
      const res = await messageApi.list(channelId, nextCursor)
      set((s) => ({
        messages: [...res.results.reverse(), ...s.messages],
        isLoading: false,
        hasMore: !!res.next,
        nextCursor: extractCursor(res.next),
      }))
    } catch (err) {
      console.error('Failed to load more messages:', err)
      set({ isLoading: false })
    }
  },

  sendMessage: async (channelId, content, replyTo) => {
    const msg = await messageApi.send(channelId, { content, reply_to: replyTo })
    // Add message to local state immediately (don't rely on SSE)
    set((s) => {
      // Avoid duplicates (SSE might also deliver it)
      if (s.messages.some((m) => m.id === msg.id)) return s
      return { messages: [...s.messages, msg], replyTo: null }
    })
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
    // Refetch messages to get updated reaction counts
    const { messages } = get()
    if (messages.length > 0) {
      const res = await messageApi.list(channelId)
      set({ messages: res.results.reverse() })
    }
  },

  removeReaction: async (channelId, messageId, emoji) => {
    await messageApi.removeReaction(channelId, messageId, emoji)
  },

  pinMessage: async (channelId, messageId) => {
    await messageApi.pin(channelId, messageId)
    await get().fetchPinnedMessages(channelId)
  },

  unpinMessage: async (channelId, messageId) => {
    await messageApi.unpin(channelId, messageId)
    await get().fetchPinnedMessages(channelId)
  },

  fetchPinnedMessages: async (channelId) => {
    try {
      const res = await messageApi.pinnedMessages(channelId)
      const items = extractResults(res as unknown as PinnedMessage[])
      set({ pinnedMessages: Array.isArray(items) ? items : [], currentPinIndex: 0 })
    } catch {
      set({ pinnedMessages: [], currentPinIndex: 0 })
    }
  },

  cyclePinIndex: (direction) => {
    const { pinnedMessages, currentPinIndex } = get()
    if (pinnedMessages.length === 0) return
    if (direction === 'next') {
      set({ currentPinIndex: (currentPinIndex + 1) % pinnedMessages.length })
    } else {
      set({ currentPinIndex: (currentPinIndex - 1 + pinnedMessages.length) % pinnedMessages.length })
    }
  },

  setReplyTo: (msg) => set({ replyTo: msg }),

  addMessage: (msg) => set((s) => {
    // Avoid duplicates
    if (s.messages.some((m) => m.id === msg.id)) return s
    return { messages: [...s.messages, msg] }
  }),

  syncUserSnapshot: (user) => set((s) => ({
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
        reply_to_preview: pin.message.reply_to_preview
          ? {
              ...pin.message.reply_to_preview,
              user: pin.message.reply_to_preview.user.id === user.id
                ? { ...pin.message.reply_to_preview.user, ...user, profile: { ...pin.message.reply_to_preview.user.profile, ...user.profile } }
                : pin.message.reply_to_preview.user,
            }
          : null,
      },
    })),
    replyTo: s.replyTo
      ? {
          ...s.replyTo,
          user: s.replyTo.user.id === user.id
            ? { ...s.replyTo.user, ...user, profile: { ...s.replyTo.user.profile, ...user.profile } }
            : s.replyTo.user,
          reply_to_preview: s.replyTo.reply_to_preview
            ? {
                ...s.replyTo.reply_to_preview,
                user: s.replyTo.reply_to_preview.user.id === user.id
                  ? { ...s.replyTo.reply_to_preview.user, ...user, profile: { ...s.replyTo.reply_to_preview.user.profile, ...user.profile } }
                  : s.replyTo.reply_to_preview.user,
              }
            : null,
        }
      : null,
  })),

  reset: () => set({
    messages: [],
    isLoading: false,
    hasMore: false,
    nextCursor: null,
    replyTo: null,
    pinnedMessages: [],
    currentPinIndex: 0,
  }),

  clear: () => set({ messages: [], hasMore: false, nextCursor: null, replyTo: null, pinnedMessages: [], currentPinIndex: 0 }),
}))
