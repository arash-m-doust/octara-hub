import { clsx } from 'clsx'

interface BadgeProps {
  count?: number
  variant?: 'default' | 'accent'
  className?: string
}

export function Badge({ count, variant = 'default', className }: BadgeProps) {
  if (!count || count <= 0) return null

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
        {
          'bg-error text-white': variant === 'default',
          'bg-accent text-white': variant === 'accent',
        },
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
