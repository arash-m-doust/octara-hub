import { type HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'raised' | 'inset' | 'flat'
}

export function Card({ variant = 'raised', className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        {
          'ind-panel-raised': variant === 'raised',
          'ind-recess': variant === 'inset',
          'bg-surface-plate rounded-ind-lg': variant === 'flat',
        },
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
