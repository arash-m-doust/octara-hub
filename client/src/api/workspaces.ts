import { api } from './client'
import type { User } from './auth'

export interface Workspace {
  id: number
  name: string
  description: string
  icon_path: string
  owner: number
  invite_code: string
  member_count: number
  is_owner: boolean
  created_at: string
  updated_at: string
}

export interface Role {
  id: number
  name: string
  color: string
  is_default: boolean
  position: number
  permissions: Record<string, boolean>
}

export interface WorkspaceMember {
  id: number
  user: User
  role: Role | null
  nickname: string
  joined_at: string
}

export interface WorkspaceUser {
  id: number
  username: string
  profile: {
    display_name: string
    avatar_path: string
    status: 'online' | 'idle' | 'dnd' | 'offline'
  }
  is_member: boolean
}

export interface Category {
  id: number
  workspace: number
  name: string
  position: number
  channels: Channel[]
}

export interface Channel {
  id: number
  workspace: number
  category: number | null
  name: string
  description: string
  type: 'text' | 'announcement'
  is_private: boolean
  is_archived: boolean
  position: number
  unread_count: number
}

export const workspaceApi = {
  list: () => api<Workspace[]>('/workspaces/'),
  create: (data: { name: string; description?: string }) =>
    api<Workspace>('/workspaces/', { method: 'POST', body: data }),
  get: (id: number) => api<Workspace>(`/workspaces/${id}/`),
  update: (id: number, data: Partial<Workspace>) =>
    api<Workspace>(`/workspaces/${id}/`, { method: 'PATCH', body: data }),
  delete: (id: number) => api(`/workspaces/${id}/`, { method: 'DELETE' }),
  refreshInvite: (id: number) =>
    api<{ invite_code: string }>(`/workspaces/${id}/invite/`, { method: 'POST' }),
  join: (invite_code: string) =>
    api<Workspace>('/workspaces/join/', { method: 'POST', body: { invite_code } }),

  // Members
  members: (id: number) => api<WorkspaceMember[]>(`/workspaces/${id}/members/`),
  users: (id: number, q?: string) =>
    api<WorkspaceUser[]>(`/workspaces/${id}/users/${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  inviteMember: (wid: number, uid: number) =>
    api<WorkspaceMember>(`/workspaces/${wid}/members/invite/`, { method: 'POST', body: { user_id: uid } }),
  updateMemberRole: (wid: number, uid: number, roleId: number) =>
    api<WorkspaceMember>(`/workspaces/${wid}/members/${uid}/role/`, { method: 'PATCH', body: { role_id: roleId } }),
  kickMember: (wid: number, uid: number) =>
    api(`/workspaces/${wid}/members/${uid}/kick/`, { method: 'DELETE' }),

  // Roles
  roles: (wid: number) => api<Role[]>(`/workspaces/${wid}/roles/`),
  createRole: (wid: number, data: { name: string; permissions: Record<string, boolean> }) =>
    api<Role>(`/workspaces/${wid}/roles/`, { method: 'POST', body: data }),

  // Categories
  categories: (wid: number) => api<Category[]>(`/workspaces/${wid}/categories/`),
  createCategory: (wid: number, data: { name: string }) =>
    api<Category>(`/workspaces/${wid}/categories/`, { method: 'POST', body: data }),

  // Channels
  channels: (wid: number) => api<Channel[]>(`/workspaces/${wid}/channels/`),
  createChannel: (wid: number, data: { name: string; category?: number; is_private?: boolean; description?: string }) =>
    api<Channel>(`/workspaces/${wid}/channels/`, { method: 'POST', body: data }),
  updateChannel: (wid: number, cid: number, data: Partial<Channel>) =>
    api<Channel>(`/workspaces/${wid}/channels/${cid}/`, { method: 'PATCH', body: data }),
  deleteChannel: (wid: number, cid: number) =>
    api(`/workspaces/${wid}/channels/${cid}/`, { method: 'DELETE' }),
}
