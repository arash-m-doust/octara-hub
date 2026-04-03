import { api, apiUpload, type ApiError } from './client'
import { authStorage } from '@/utils/authStorage'

export interface Attachment {
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

export const fileApi = {
  upload: (formData: FormData) => apiUpload<Attachment>('/files/upload/', formData),
  channelFiles: (channelId: number) => api<Attachment[]>(`/files/channel/${channelId}/`),
  dmFiles: (threadId: number) => api<Attachment[]>(`/files/dm/${threadId}/`),
  delete: (id: number) => api(`/files/${id}/delete/`, { method: 'DELETE' }),
  previewBlob: async (previewPath: string) => {
    const token = authStorage.getAccessToken()
    const res = await fetch(`/api${previewPath}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      let detail = 'Preview request failed'
      try {
        const payload = await res.json() as { detail?: string }
        if (payload?.detail) detail = payload.detail
      } catch {
        // ignore non-json preview errors
      }
      const error: ApiError = { status: res.status, detail }
      throw error
    }
    return res.blob()
  },
}
