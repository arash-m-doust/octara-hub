import { create } from 'zustand'
import { authApi, type User } from '@/api/auth'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (data: { username: string; email: string; password: string; password_confirm: string; display_name?: string }) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  updateProfile: (data: Partial<{ display_name: string; locale: string; theme: string; status: string }>) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (username, password) => {
    const { access, refresh } = await authApi.login({ username, password })
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    const user = await authApi.me()
    set({ user, isAuthenticated: true })
  },

  register: async (data) => {
    await authApi.register(data)
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
  },

  fetchMe: async () => {
    try {
      const user = await authApi.me()
      set({ user, isAuthenticated: true })
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      set({ user: null, isAuthenticated: false })
    }
  },

  updateProfile: async (data) => {
    const user = await authApi.updateProfile(data)
    set({ user })
  },
}))
