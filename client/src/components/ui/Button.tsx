import { type ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'default', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-skeu',
        {
          'skeu-button': variant === 'default',
          'skeu-button-primary': variant === 'primary',
          'bg-transparent hover:bg-surface-inset px-3 py-1.5 text-sm': variant === 'ghost',
          'skeu-button bg-error/10 text-error border-error/20 hover:bg-error/20': variant === 'danger',
        },
        {
          'px-2.5 py-1 text-xs': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-2.5 text-base': size === 'lg',
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
