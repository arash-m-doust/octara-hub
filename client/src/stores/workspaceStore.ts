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
    const res = await workspaceApi.list()
    set({ workspaces: extractResults(res) })
  },

  fetchCategories: async (wid) => {
    const res = await workspaceApi.categories(wid)
    set({ categories: extractResults(res) })
  },

  fetchChannels: async (wid) => {
    const res = await workspaceApi.channels(wid)
    set({ channels: extractResults(res) })
  },

  fetchMembers: async (wid) => {
    const res = await workspaceApi.members(wid)
    set({ members: extractResults(res) })
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
