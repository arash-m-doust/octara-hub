import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${sizeClasses[size]} ind-panel-raised p-6`}
        style={{ borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3), inset 0 1px 0 var(--color-metal-highlight)' }}
      >
        {/* Header strip */}
        <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '2px solid transparent', borderImage: 'linear-gradient(90deg, var(--color-border-groove), var(--color-metal-highlight), var(--color-border-groove)) 1' }}>
          <h2 className="text-lg font-semibold tracking-wide" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-ind ind-button p-0 text-muted"
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
