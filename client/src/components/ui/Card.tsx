import { type HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'raised' | 'inset' | 'flat'
}

export function Card({ variant = 'raised', className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-skeu-lg',
        {
          'skeu-panel-raised': variant === 'raised',
          'skeu-inset': variant === 'inset',
          'bg-surface-raised': variant === 'flat',
        },
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
