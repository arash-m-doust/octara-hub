import { create } from 'zustand'
import { workspaceApi, type Workspace, type Category, type Channel, type WorkspaceMember } from '@/api/workspaces'

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
    const workspaces = await workspaceApi.list()
    set({ workspaces })
  },

  setCurrentWorkspace: (ws) => {
    set({ currentWorkspace: ws, currentChannel: null, categories: [], channels: [], members: [] })
    if (ws) {
      get().fetchCategories(ws.id)
      get().fetchChannels(ws.id)
      get().fetchMembers(ws.id)
    }
  },

  fetchCategories: async (wid) => {
    const categories = await workspaceApi.categories(wid)
    set({ categories })
  },

  fetchChannels: async (wid) => {
    const channels = await workspaceApi.channels(wid)
    set({ channels })
  },

  fetchMembers: async (wid) => {
    const members = await workspaceApi.members(wid)
    set({ members })
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
