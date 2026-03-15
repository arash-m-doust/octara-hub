import { type ReactNode, useState, useRef, useEffect } from 'react'

interface DropdownItem {
  label: string
  icon?: string
  onClick: () => void
  danger?: boolean
}

interface DropdownMenuProps {
  trigger: ReactNode
  items: DropdownItem[]
}

export function DropdownMenu({ trigger, items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative inline-flex">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className="absolute end-0 top-full mt-1 z-40 min-w-[160px] bg-white rounded-skeu shadow-skeu-modal border border-border-light py-1">
          {items.map((item, i) => (
            <button
              key={i}
              className={`w-full text-start px-3 py-1.5 text-sm hover:bg-surface-inset transition-colors ${
                item.danger ? 'text-error' : 'text-gray-700'
              }`}
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
            >
              {item.icon && <span className="me-2">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
