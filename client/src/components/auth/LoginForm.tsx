import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Radio } from 'lucide-react'

interface LoginFormProps {
  onSwitchToRegister: () => void
  onSwitchToForgot: () => void
}

export function LoginForm({ onSwitchToRegister, onSwitchToForgot }: LoginFormProps) {
  const { t } = useTranslation()
  const { login } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (err: unknown) {
      const errorObj = err as { detail?: string }
      setError(errorObj.detail || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm ind-panel-raised p-6" style={{ borderRadius: '12px' }}>
      {/* Logo area */}
      <div className="flex flex-col items-center mb-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
          style={{
            background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
            border: '2px solid var(--color-border)',
            boxShadow: 'inset 0 1px 0 var(--color-metal-highlight), 0 2px 6px var(--color-metal-shadow)',
          }}
        >
          <Radio size={24} style={{ color: 'var(--color-accent)' }} />
        </div>
        <h1 className="text-xl font-bold tracking-wide" style={{ color: 'var(--color-text-primary)' }}>{t('auth.login')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('auth.username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <Input
          label={t('auth.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        <Button variant="primary" type="submit" className="w-full" disabled={loading}>
          {loading ? t('common.loading') : t('auth.login')}
        </Button>
      </form>
      <div className="mt-4 text-center space-y-2">
        <button onClick={onSwitchToForgot} className="text-xs hover:underline" style={{ color: 'var(--color-accent)' }}>
          {t('auth.forgotPassword')}
        </button>
        <p className="text-xs text-muted">
          {t('auth.noAccount')}{' '}
          <button onClick={onSwitchToRegister} className="hover:underline" style={{ color: 'var(--color-accent)' }}>
            {t('auth.register')}
          </button>
        </p>
      </div>
    </div>
  )
}
