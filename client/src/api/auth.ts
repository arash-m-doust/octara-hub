import { api } from './client'

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_superuser: boolean
  profile: {
    display_name: string
    avatar_path: string
    status: 'online' | 'idle' | 'dnd' | 'offline'
    locale: string
    theme: string
    last_seen_at: string | null
  }
}

export interface PlatformUser {
  id: number
  username: string
  profile: {
    display_name: string
    avatar_path: string
    status: 'online' | 'idle' | 'dnd' | 'offline'
  }
}

export const authApi = {
  register: (data: { username: string; email: string; password: string; password_confirm: string; display_name?: string }) =>
    api<User>('/auth/register/', { method: 'POST', body: data }),

  login: (data: { username: string; password: string }) =>
    api<{ access: string; refresh: string }>('/auth/login/', { method: 'POST', body: data }),

  users: (q?: string) =>
    api<PlatformUser[]>(`/auth/users/${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  me: () => api<User>('/auth/me/'),

  updateProfile: (data: Partial<{ display_name: string; locale: string; theme: string; status: string; first_name: string; last_name: string }>) =>
    api<User>('/auth/me/', { method: 'PATCH', body: data }),

  forgotPassword: (email: string) =>
    api('/auth/forgot-password/', { method: 'POST', body: { email } }),

  resetPassword: (data: { uid: string; token: string; password: string; password_confirm: string }) =>
    api('/auth/reset-password/', { method: 'POST', body: data }),
}
