import { api } from './client'
import type { User } from './auth'
import type { Message, PaginatedResponse } from './messages'

export interface DMThread {
  id: number
  is_group: boolean
  name: string
  participants: { user: User; last_read_message_id: number | null; joined_at: string }[]
  last_message: Message | null
  unread_count: number
  created_at: string
  updated_at: string
}

export const dmApi = {
  threads: () => api<DMThread[]>('/dm/threads/'),
  create: (user_ids: number[], name?: string) =>
    api<DMThread>('/dm/threads/create/', { method: 'POST', body: { user_ids, name } }),
  messages: (threadId: number, cursor?: string) => {
    const params = cursor ? `?cursor=${cursor}` : ''
    return api<PaginatedResponse<Message>>(`/dm/threads/${threadId}/messages/${params}`)
  },
  sendMessage: (threadId: number, data: { content: string; reply_to?: number }) =>
    api<Message>(`/dm/threads/${threadId}/messages/`, { method: 'POST', body: data }),
  editMessage: (threadId: number, messageId: number, content: string) =>
    api<Message>(`/dm/threads/${threadId}/messages/${messageId}/`, { method: 'PATCH', body: { content } }),
  deleteMessage: (threadId: number, messageId: number) =>
    api(`/dm/threads/${threadId}/messages/${messageId}/`, { method: 'DELETE' }),
}
