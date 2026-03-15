import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

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
    <Card className="w-full max-w-sm p-6">
      <h1 className="text-xl font-bold text-center mb-6 text-gray-800">{t('auth.login')}</h1>
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
        <button onClick={onSwitchToForgot} className="text-xs text-accent hover:underline">
          {t('auth.forgotPassword')}
        </button>
        <p className="text-xs text-muted">
          {t('auth.noAccount')}{' '}
          <button onClick={onSwitchToRegister} className="text-accent hover:underline">
            {t('auth.register')}
          </button>
        </p>
      </div>
    </Card>
  )
}
