import { create } from 'zustand'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

interface ToastState {
  toasts: ToastItem[]
  add: (message: string, type?: ToastItem['type'], duration?: number) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'info', duration = 4000) => {
    const id = `${Date.now()}-${Math.random()}`
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duration }] }))
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (message: string) => useToastStore.getState().add(message, 'success'),
  error: (message: string) => useToastStore.getState().add(message, 'error', 6000),
  info: (message: string) => useToastStore.getState().add(message, 'info'),
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const colors = {
  success: { bg: 'rgba(0,230,118,0.1)', border: 'rgba(0,230,118,0.3)', color: 'var(--color-led-online)' },
  error: { bg: 'rgba(255,82,82,0.1)', border: 'rgba(255,82,82,0.3)', color: '#FF5252' },
  info: { bg: 'var(--color-accent-soft)', border: 'var(--color-accent)', color: 'var(--color-accent)' },
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore()

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        insetInlineEnd: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 360,
      }}
    >
      {toasts.map((item) => {
        const Icon = icons[item.type]
        const palette = colors[item.type]
        return (
          <div
            key={item.id}
            style={{
              background: palette.bg,
              border: `1px solid ${palette.border}`,
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              animation: 'slideIn .2s ease',
            }}
          >
            <Icon size={16} style={{ color: palette.color, flexShrink: 0, marginTop: 1 }} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
              {item.message}
            </span>
            <button
              onClick={() => remove(item.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: 'var(--color-text-muted)',
              }}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
      <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </div>
  )
}
