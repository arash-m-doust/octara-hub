import { type ReactNode, useState } from 'react'
import { clsx } from 'clsx'

interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={clsx(
            'absolute z-50 px-2 py-1 text-xs font-medium text-white whitespace-nowrap rounded-ind',
            {
              'bottom-full mb-2 left-1/2 -translate-x-1/2': position === 'top',
              'top-full mt-2 left-1/2 -translate-x-1/2': position === 'bottom',
              'end-full me-2 top-1/2 -translate-y-1/2': position === 'left',
              'start-full ms-2 top-1/2 -translate-y-1/2': position === 'right',
            },
          )}
          style={{
            background: 'linear-gradient(180deg, var(--color-surface-inset) 0%, var(--color-border-groove) 100%)',
            border: '1px solid var(--color-border-groove)',
            boxShadow: '0 4px 12px var(--color-metal-shadow)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
