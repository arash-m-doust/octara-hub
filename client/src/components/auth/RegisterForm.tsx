import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: 'var(--color-border)' }
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) return { score, label: 'Weak', color: '#FF5252' }
  if (score <= 2) return { score, label: 'Fair', color: 'var(--color-led-idle)' }
  if (score <= 3) return { score, label: 'Good', color: 'var(--color-accent)' }
  return { score, label: 'Strong', color: 'var(--color-led-online)' }
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { t } = useTranslation()
  const { register, login } = useAuthStore()
  const [form, setForm] = useState({ username: '', email: '', password: '', password_confirm: '', display_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      await login(form.username, form.password)
    } catch (err: unknown) {
      const errorObj = err as Record<string, string[] | string>
      const firstError = Object.values(errorObj).flat()[0]
      setError(typeof firstError === 'string' ? firstError : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="w-full max-w-sm ind-panel-raised p-6" style={{ borderRadius: '12px' }}>
      <div className="flex flex-col items-center mb-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
          style={{
            background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
            border: '2px solid var(--color-border)',
            boxShadow: 'inset 0 1px 0 var(--color-metal-highlight), 0 2px 6px var(--color-metal-shadow)',
          }}
        >
          <img src="/octara-brand-logo.svg" alt="Octara Hub" className="w-8 h-8 rounded-md" />
        </div>
        <h1 className="text-xl font-bold tracking-wide" style={{ color: 'var(--color-text-primary)' }}>{t('auth.register')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label={t('auth.displayName')} value={form.display_name} onChange={update('display_name')} />
        <Input label={t('auth.username')} value={form.username} onChange={update('username')} autoFocus />
        <Input label={t('auth.email')} type="email" value={form.email} onChange={update('email')} />
        <Input label={t('auth.password')} type="password" value={form.password} onChange={update('password')} />
        {form.password && (() => {
          const strength = getPasswordStrength(form.password)
          return (
            <div style={{ marginTop: -8 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      background: i <= strength.score ? strength.color : 'var(--color-border)',
                      transition: 'background .3s',
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: 11, color: strength.color }}>{strength.label}</p>
            </div>
          )
        })()}
        <Input label={t('auth.confirmPassword')} type="password" value={form.password_confirm} onChange={update('password_confirm')} />
        {error && <p className="text-sm text-error">{error}</p>}
        <Button variant="primary" type="submit" className="w-full" disabled={loading}>
          {loading ? t('common.loading') : t('auth.register')}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted">
        {t('auth.hasAccount')}{' '}
        <button onClick={onSwitchToLogin} className="hover:underline" style={{ color: 'var(--color-accent)' }}>
          {t('auth.login')}
        </button>
      </p>
    </div>
  )
}
