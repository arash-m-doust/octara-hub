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
            'absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-md whitespace-nowrap',
            {
              'bottom-full mb-2 left-1/2 -translate-x-1/2': position === 'top',
              'top-full mt-2 left-1/2 -translate-x-1/2': position === 'bottom',
              'end-full me-2 top-1/2 -translate-y-1/2': position === 'left',
              'start-full ms-2 top-1/2 -translate-y-1/2': position === 'right',
            },
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
