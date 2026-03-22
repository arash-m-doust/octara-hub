import { type InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'ind-input',
            error && 'border-error',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
