import { api } from './client'
import type { Message } from './messages'
import type { Attachment } from './files'

interface PaginatedResults<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export const searchApi = {
  messages: (params: { q: string; workspace_id?: number; channel_id?: number; user_id?: number; dm_thread_id?: number }) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)) })
    return api<PaginatedResults<Message>>(`/search/messages/?${qs}`)
  },
  files: (params: { q?: string; channel_id?: number; type?: string }) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)) })
    return api<PaginatedResults<Attachment>>(`/search/files/?${qs}`)
  },
}
