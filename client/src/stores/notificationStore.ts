import { create } from 'zustand'
import { api, extractResults } from '@/api/client'

export interface NotificationItem {
  id: number
  type: string
  title: string
  body: string
  reference_type?: string
  reference_id?: number | null
  is_read: boolean
  created_at: string
}

interface NotificationState {
  notifications: NotificationItem[]
  unreadCount: number
  fetchNotifications: () => Promise<void>
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
  addNotification: (notification: NotificationItem) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const res = await api<NotificationItem[]>('/notifications/')
      const list = extractResults(res)
      set({
        notifications: list,
        unreadCount: list.filter((item) => !item.is_read).length,
      })
    } catch {
      // Keep UI quiet; global toasts can be added for explicit UX later.
    }
  },

  markRead: async (id) => {
    await api(`/notifications/${id}/read/`, { method: 'POST' })
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }))
  },

  markAllRead: async () => {
    await api('/notifications/read-all/', { method: 'POST' })
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }))
  },

  addNotification: (notification) => set((s) => ({
    notifications: [notification, ...s.notifications],
    unreadCount: s.unreadCount + (notification.is_read ? 0 : 1),
  })),
}))
