import { clsx } from 'clsx'

interface AvatarProps {
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg'
  status?: 'online' | 'idle' | 'dnd' | 'offline'
}

const ledColors: Record<string, string> = {
  online: 'var(--color-led-online)',
  idle: 'var(--color-led-idle)',
  dnd: 'var(--color-led-dnd)',
  offline: 'var(--color-led-off)',
}

export function Avatar({ src, name, size = 'md', status }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  }

  const ledSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'
  const statusColor = status ? ledColors[status] : undefined
  const isActive = status && status !== 'offline'

  return (
    <div className="relative inline-flex">
      {src ? (
        <img
          src={src}
          alt={name}
          className={clsx(
            'rounded-full object-cover',
            sizeClasses[size],
          )}
          style={{
            border: '2px solid var(--color-border)',
            boxShadow: 'inset 0 1px 2px var(--color-metal-shadow), 0 1px 3px var(--color-metal-shadow)',
          }}
        />
      ) : (
        <div
          className={clsx(
            'rounded-full flex items-center justify-center font-semibold',
            sizeClasses[size],
          )}
          style={{
            background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
            border: '2px solid var(--color-border)',
            boxShadow: 'inset 0 1px 0 var(--color-metal-highlight), 0 1px 3px var(--color-metal-shadow)',
            color: 'var(--color-accent)',
          }}
        >
          {initials || '?'}
        </div>
      )}
      {status && (
        <span
          className={clsx('absolute bottom-0 end-0 rounded-full ind-led', ledSize)}
          style={{
            backgroundColor: statusColor,
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: 'var(--color-surface-raised)',
            boxShadow: isActive ? `0 0 4px ${statusColor}, 0 0 8px ${statusColor}` : 'none',
          }}
        />
      )}
    </div>
  )
}
