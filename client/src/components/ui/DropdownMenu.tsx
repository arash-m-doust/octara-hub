import { type ReactNode, useState, useRef, useEffect } from 'react'

interface DropdownItem {
  label: string
  icon?: ReactNode
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
        <div
          className="absolute end-0 top-full mt-1 z-40 min-w-[160px] ind-panel py-1"
          style={{ boxShadow: '0 6px 20px var(--color-metal-shadow)' }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              className="w-full text-start px-3 py-1.5 text-sm transition-all duration-100 hover:bg-surface-inset"
              style={{ color: item.danger ? '#FF5252' : 'var(--color-text-primary)' }}
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
            >
              {item.icon && <span className="me-2 inline-flex items-center">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
