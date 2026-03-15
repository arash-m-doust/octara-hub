import { api, apiUpload } from './client'

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
}
