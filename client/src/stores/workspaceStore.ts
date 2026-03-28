import { create } from 'zustand'
import { workspaceApi, type Workspace, type Category, type Channel, type WorkspaceMember, type WorkspaceUser } from '@/api/workspaces'
import { extractResults } from '@/api/client'
import type { User } from '@/api/auth'

interface WorkspaceState {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  categories: Category[]
  channels: Channel[]
  members: WorkspaceMember[]
  workspaceUsers: WorkspaceUser[]
  currentChannel: Channel | null

  fetchWorkspaces: () => Promise<void>
  setCurrentWorkspace: (ws: Workspace | null) => void
  fetchCategories: (wid: number) => Promise<void>
  fetchChannels: (wid: number) => Promise<void>
  fetchMembers: (wid: number) => Promise<void>
  fetchWorkspaceUsers: (wid: number, q?: string) => Promise<void>
  setCurrentChannel: (ch: Channel | null) => void
  createWorkspace: (data: { name: string; description?: string }) => Promise<Workspace>
  createChannel: (wid: number, data: { name: string; category?: number; is_private?: boolean }) => Promise<Channel>
  createCategory: (wid: number, data: { name: string }) => Promise<Category>
  inviteMember: (wid: number, userId: number) => Promise<void>
  updateMemberRole: (wid: number, userId: number, roleId: number) => Promise<void>
  kickMember: (wid: number, userId: number) => Promise<void>
  syncUserSnapshot: (user: User) => void
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  categories: [],
  channels: [],
  members: [],
  workspaceUsers: [],
  currentChannel: null,

  fetchWorkspaces: async () => {
    try {
      const res = await workspaceApi.list()
      const list = extractResults(res)
      set({ workspaces: list })
      // Auto-select first workspace if none selected
      if (!get().currentWorkspace && list.length > 0) {
        get().setCurrentWorkspace(list[0])
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err)
    }
  },

  fetchCategories: async (wid) => {
    try {
      const res = await workspaceApi.categories(wid)
      set({ categories: extractResults(res) })
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  },

  fetchChannels: async (wid) => {
    try {
      const res = await workspaceApi.channels(wid)
      const list = extractResults(res)
      set({ channels: list })
      // Auto-select first channel if none selected
      if (!get().currentChannel && list.length > 0) {
        set({ currentChannel: list[0] })
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err)
    }
  },

  fetchMembers: async (wid) => {
    try {
      const res = await workspaceApi.members(wid)
      set({ members: extractResults(res) })
    } catch (err) {
      console.error('Failed to fetch members:', err)
    }
  },

  fetchWorkspaceUsers: async (wid, q) => {
    try {
      const res = await workspaceApi.users(wid, q)
      set({ workspaceUsers: extractResults(res) })
    } catch (err) {
      console.error('Failed to fetch workspace users:', err)
    }
  },

  setCurrentWorkspace: (ws) => {
    // Clear workspace-scoped slices first to prevent flashing stale data.
    set({ currentWorkspace: ws, currentChannel: null, categories: [], channels: [], members: [], workspaceUsers: [] })
    if (ws) {
      // Hydrate all workspace dependent resources in parallel fire-and-forget style.
      get().fetchCategories(ws.id)
      get().fetchChannels(ws.id)
      get().fetchMembers(ws.id)
      get().fetchWorkspaceUsers(ws.id)
    }
  },

  setCurrentChannel: (ch) => set({ currentChannel: ch }),

  createWorkspace: async (data) => {
    const ws = await workspaceApi.create(data)
    set((s) => ({ workspaces: [...s.workspaces, ws] }))
    return ws
  },

  createChannel: async (wid, data) => {
    const ch = await workspaceApi.createChannel(wid, data)
    set((s) => ({ channels: [...s.channels, ch] }))
    return ch
  },

  createCategory: async (wid, data) => {
    const cat = await workspaceApi.createCategory(wid, data)
    set((s) => ({ categories: [...s.categories, cat] }))
    return cat
  },

  inviteMember: async (wid, userId) => {
    await workspaceApi.inviteMember(wid, userId)
    // Keep both members and directory lists consistent after invite.
    await Promise.all([
      get().fetchMembers(wid),
      get().fetchWorkspaceUsers(wid),
    ])
  },

  updateMemberRole: async (wid, userId, roleId) => {
    await workspaceApi.updateMemberRole(wid, userId, roleId)
    // Role badges and permission-driven UI depend on these lists.
    await Promise.all([
      get().fetchMembers(wid),
      get().fetchWorkspaceUsers(wid),
    ])
  },

  kickMember: async (wid, userId) => {
    await workspaceApi.kickMember(wid, userId)
    // Remove kicked user from all rendered member contexts.
    await Promise.all([
      get().fetchMembers(wid),
      get().fetchWorkspaceUsers(wid),
    ])
  },

  syncUserSnapshot: (user) => set((s) => ({
    members: s.members.map((member) => (
      member.user.id === user.id
        ? { ...member, user: { ...member.user, ...user, profile: { ...member.user.profile, ...user.profile } } }
        : member
    )),
    workspaceUsers: s.workspaceUsers.map((workspaceUser) => (
      workspaceUser.id === user.id
        ? {
            ...workspaceUser,
            username: user.username,
            profile: {
              ...workspaceUser.profile,
              display_name: user.profile?.display_name || workspaceUser.profile.display_name,
              avatar_path: user.profile?.avatar_path || workspaceUser.profile.avatar_path,
              status: user.profile?.status || workspaceUser.profile.status,
            },
          }
        : workspaceUser
    )),
  })),

  reset: () => set({
    workspaces: [],
    currentWorkspace: null,
    categories: [],
    channels: [],
    members: [],
    workspaceUsers: [],
    currentChannel: null,
  }),
}))
