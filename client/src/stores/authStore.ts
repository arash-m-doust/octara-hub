import { create } from 'zustand'
import { authApi, type User } from '@/api/auth'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useDMStore } from '@/stores/dmStore'
import { useMessageStore } from '@/stores/messageStore'
import { useUIStore } from '@/stores/uiStore'
import { useCallStore } from '@/stores/callStore'
import { authStorage } from '@/utils/authStorage'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (data: { username: string; email: string; password: string; password_confirm: string; display_name?: string }) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  updateProfile: (data: Partial<{ display_name: string; locale: string; theme: string; status: string }>) => Promise<void>
}

function syncUserAcrossStores(user: User) {
  // Central fan-out so display_name/avatar/status updates appear immediately
  // in all already-loaded lists and messages.
  useWorkspaceStore.getState().syncUserSnapshot(user)
  useDMStore.getState().syncUserSnapshot(user)
  useMessageStore.getState().syncUserSnapshot(user)
  useCallStore.getState().syncUserSnapshot(user)
}

function resetAllStores() {
  // Session isolation guard: clear cross-domain UI data on auth boundary.
  useWorkspaceStore.getState().reset()
  useDMStore.getState().reset()
  useMessageStore.getState().reset()
  useUIStore.getState().reset()
  useCallStore.getState().reset()
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (username, password) => {
    const { access, refresh } = await authApi.login({ username, password })
    // Set namespace before storing tokens to avoid leaking into wrong session.
    authStorage.setSessionFromUsername(username)
    authStorage.setAccessToken(access)
    authStorage.setRefreshToken(refresh)
    const user = await authApi.me()
    resetAllStores()
    set({ user, isAuthenticated: true })
  },

  register: async (data) => {
    await authApi.register(data)
  },

  logout: () => {
    authStorage.clearTokens()
    resetAllStores()
    set({ user: null, isAuthenticated: false })
  },

  fetchMe: async () => {
    try {
      const user = await authApi.me()
      // Ensure URL/storage namespace matches canonical backend username.
      authStorage.bindSessionToUsername(user.username)
      set({ user, isAuthenticated: true })
    } catch {
      authStorage.clearTokens()
      resetAllStores()
      set({ user: null, isAuthenticated: false })
    }
  },

  updateProfile: async (data) => {
    const user = await authApi.updateProfile(data)
    syncUserAcrossStores(user)
    set({ user })
  },
}))
