import { create } from 'zustand'

type RightPanel = 'members' | 'files' | 'pinned' | 'search' | null
type View = 'workspace' | 'dm'

interface UIState {
  rightPanel: RightPanel
  view: View
  isMobileMenuOpen: boolean
  searchQuery: string

  setRightPanel: (panel: RightPanel) => void
  toggleRightPanel: (panel: RightPanel) => void
  setView: (view: View) => void
  setMobileMenuOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  rightPanel: null,
  view: 'workspace',
  isMobileMenuOpen: false,
  searchQuery: '',

  setRightPanel: (panel) => set({ rightPanel: panel }),
  toggleRightPanel: (panel) => set((s) => ({ rightPanel: s.rightPanel === panel ? null : panel })),
  setView: (view) => set({ view }),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
