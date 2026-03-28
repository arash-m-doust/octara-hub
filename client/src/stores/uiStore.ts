import { create } from 'zustand'

type RightPanel = 'members' | 'files' | 'pinned' | 'search' | null
type View = 'workspace' | 'dm'
const LEFT_SIDEBAR_MIN = 200
const LEFT_SIDEBAR_MAX = 420
const RIGHT_PANEL_MIN = 240
const RIGHT_PANEL_MAX = 420
const LEFT_SIDEBAR_DEFAULT = 240
const RIGHT_PANEL_DEFAULT = 260

function readStoredWidth(key: string, fallback: number, min: number, max: number) {
  if (typeof window === 'undefined') return fallback
  const raw = window.localStorage.getItem(key)
  const parsed = raw ? Number(raw) : fallback
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

interface UIState {
  rightPanel: RightPanel
  view: View
  isMobileMenuOpen: boolean
  searchQuery: string
  leftSidebarWidth: number
  rightPanelWidth: number

  setRightPanel: (panel: RightPanel) => void
  toggleRightPanel: (panel: RightPanel) => void
  setView: (view: View) => void
  setMobileMenuOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  setLeftSidebarWidth: (width: number) => void
  setRightPanelWidth: (width: number) => void
  reset: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  rightPanel: null,
  view: 'workspace',
  isMobileMenuOpen: false,
  searchQuery: '',
  leftSidebarWidth: readStoredWidth('ui:leftSidebarWidth', LEFT_SIDEBAR_DEFAULT, LEFT_SIDEBAR_MIN, LEFT_SIDEBAR_MAX),
  rightPanelWidth: readStoredWidth('ui:rightPanelWidth', RIGHT_PANEL_DEFAULT, RIGHT_PANEL_MIN, RIGHT_PANEL_MAX),

  setRightPanel: (panel) => set({ rightPanel: panel }),
  toggleRightPanel: (panel) => set((s) => ({ rightPanel: s.rightPanel === panel ? null : panel })),
  setView: (view) => set({ view }),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLeftSidebarWidth: (width) =>
    set(() => {
      const next = Math.max(LEFT_SIDEBAR_MIN, Math.min(LEFT_SIDEBAR_MAX, width))
      if (typeof window !== 'undefined') window.localStorage.setItem('ui:leftSidebarWidth', String(next))
      return { leftSidebarWidth: next }
    }),
  setRightPanelWidth: (width) =>
    set(() => {
      const next = Math.max(RIGHT_PANEL_MIN, Math.min(RIGHT_PANEL_MAX, width))
      if (typeof window !== 'undefined') window.localStorage.setItem('ui:rightPanelWidth', String(next))
      return { rightPanelWidth: next }
    }),
  reset: () => set({
    rightPanel: null,
    view: 'workspace',
    isMobileMenuOpen: false,
    searchQuery: '',
  }),
}))
