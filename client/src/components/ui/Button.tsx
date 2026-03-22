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
        'inline-flex items-center justify-center font-medium transition-all duration-100 rounded-ind',
        {
          'ind-button': variant === 'default',
          'ind-button-primary': variant === 'primary',
          'bg-transparent hover:bg-surface-inset px-3 py-1.5 text-sm cursor-pointer': variant === 'ghost',
          'ind-button text-error': variant === 'danger',
        },
        {
          'px-2.5 py-1 text-xs': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-2.5 text-base': size === 'lg',
        },
        className,
      )}
      style={variant === 'danger' ? {
        background: 'linear-gradient(180deg, rgba(255,82,82,0.15) 0%, rgba(255,82,82,0.08) 100%)',
        borderColor: 'rgba(255,82,82,0.3)',
      } : undefined}
      {...props}
    >
      {children}
    </button>
  )
}
