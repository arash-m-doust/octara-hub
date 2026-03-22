import { clsx } from 'clsx'

interface BadgeProps {
  count?: number
  variant?: 'default' | 'accent'
  className?: string
}

export function Badge({ count, variant = 'default', className }: BadgeProps) {
  if (!count || count <= 0) return null

  const bg = variant === 'accent' ? 'var(--color-accent)' : '#FF5252'
  const glow = variant === 'accent' ? 'var(--color-accent-glow)' : 'rgba(255,82,82,0.4)'

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white',
        className,
      )}
      style={{
        backgroundColor: bg,
        boxShadow: `0 0 6px ${glow}`,
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
