import { api } from './client'
import type { User } from './auth'

export interface MessageAttachment {
  id: number
  message: number
  user: number
  workspace: number | null
  original_filename: string
  mime_type: string
  file_size: number
  checksum: string
  created_at: string
  download_url: string
  preview_url: string | null
}

export interface Message {
  id: number
  channel: number | null
  dm_thread: number | null
  user: User
  content: string
  reply_to: number | null
  is_edited: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  reactions: { emoji: string; count: number; reacted: boolean }[]
  reply_to_preview: { id: number; content: string; user: User } | null
  attachments: MessageAttachment[]
}

export interface PaginatedResponse<T> {
  next: string | null
  previous: string | null
  results: T[]
}

export const messageApi = {
  list: (channelId: number, cursor?: string) => {
    const params = cursor ? `?cursor=${cursor}` : ''
    return api<PaginatedResponse<Message>>(`/channels/${channelId}/messages/${params}`)
  },
  send: (channelId: number, data: { content: string; reply_to?: number }) =>
    api<Message>(`/channels/${channelId}/messages/`, { method: 'POST', body: data }),
  edit: (channelId: number, messageId: number, content: string) =>
    api<Message>(`/channels/${channelId}/messages/${messageId}/`, { method: 'PATCH', body: { content } }),
  delete: (channelId: number, messageId: number) =>
    api(`/channels/${channelId}/messages/${messageId}/`, { method: 'DELETE' }),

  addReaction: (channelId: number, messageId: number, emoji: string) =>
    api(`/channels/${channelId}/messages/${messageId}/reactions/`, { method: 'POST', body: { emoji } }),
  removeReaction: (channelId: number, messageId: number, emoji: string) =>
    api(`/channels/${channelId}/messages/${messageId}/reactions/?emoji=${emoji}`, { method: 'DELETE' }),

  pin: (channelId: number, messageId: number) =>
    api(`/channels/${channelId}/messages/${messageId}/pin/`, { method: 'POST' }),
  unpin: (channelId: number, messageId: number) =>
    api(`/channels/${channelId}/messages/${messageId}/pin/`, { method: 'DELETE' }),
  pinnedMessages: (channelId: number) =>
    api(`/channels/${channelId}/pins/`),

  typing: (channelId: number) =>
    api(`/channels/${channelId}/typing/`, { method: 'POST' }),
}
