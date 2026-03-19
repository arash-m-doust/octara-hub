import { api } from './client'
import type { User } from './auth'

export interface AdminStats {
  total_users: number
  total_workspaces: number
  total_messages: number
  total_channels: number
}

export interface AdminWorkspace {
  id: number
  name: string
  owner__username: string
  created_at: string
  member_count_val: number
}

export const adminApi = {
  stats: () => api<AdminStats>('/admin-panel/stats/'),
  users: () => api<{ count: number; results: User[] }>('/admin-panel/users/'),
  updateUser: (id: number, data: { is_staff?: boolean; is_active?: boolean }) =>
    api<User>(`/admin-panel/users/${id}/`, { method: 'PATCH', body: data }),
  deleteUser: (id: number) =>
    api(`/admin-panel/users/${id}/`, { method: 'DELETE' }),
  workspaces: () => api<AdminWorkspace[]>('/admin-panel/workspaces/'),
  deleteWorkspace: (id: number) =>
    api(`/admin-panel/workspaces/${id}/`, { method: 'DELETE' }),
  deleteMessage: (id: number) =>
    api(`/admin-panel/messages/${id}/`, { method: 'DELETE' }),
}
