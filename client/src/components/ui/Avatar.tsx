import { clsx } from 'clsx'

interface AvatarProps {
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg'
  status?: 'online' | 'idle' | 'dnd' | 'offline'
}

const statusColors = {
  online: 'bg-success',
  idle: 'bg-warning',
  dnd: 'bg-error',
  offline: 'bg-muted',
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

  return (
    <div className="relative inline-flex">
      {src ? (
        <img
          src={src}
          alt={name}
          className={clsx(
            'rounded-full object-cover border border-border-light shadow-skeu-raised',
            sizeClasses[size],
          )}
        />
      ) : (
        <div
          className={clsx(
            'rounded-full flex items-center justify-center font-medium',
            'bg-accent-soft text-accent border border-border-light shadow-skeu-raised',
            sizeClasses[size],
          )}
        >
          {initials || '?'}
        </div>
      )}
      {status && (
        <span
          className={clsx(
            'absolute bottom-0 end-0 rounded-full border-2 border-white',
            statusColors[status],
            size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3',
          )}
        />
      )}
    </div>
  )
}
