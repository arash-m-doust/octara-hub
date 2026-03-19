import { create } from 'zustand'
import { workspaceApi, type Workspace, type Category, type Channel, type WorkspaceMember } from '@/api/workspaces'
import { extractResults } from '@/api/client'

interface WorkspaceState {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  categories: Category[]
  channels: Channel[]
  members: WorkspaceMember[]
  currentChannel: Channel | null

  fetchWorkspaces: () => Promise<void>
  setCurrentWorkspace: (ws: Workspace | null) => void
  fetchCategories: (wid: number) => Promise<void>
  fetchChannels: (wid: number) => Promise<void>
  fetchMembers: (wid: number) => Promise<void>
  setCurrentChannel: (ch: Channel | null) => void
  createWorkspace: (data: { name: string; description?: string }) => Promise<Workspace>
  createChannel: (wid: number, data: { name: string; category?: number; is_private?: boolean }) => Promise<Channel>
  createCategory: (wid: number, data: { name: string }) => Promise<Category>
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  categories: [],
  channels: [],
  members: [],
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

  setCurrentWorkspace: (ws) => {
    set({ currentWorkspace: ws, currentChannel: null, categories: [], channels: [], members: [] })
    if (ws) {
      get().fetchCategories(ws.id)
      get().fetchChannels(ws.id)
      get().fetchMembers(ws.id)
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
}))
