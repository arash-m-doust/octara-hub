import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface RegisterFormProps {
  onSwitchToLogin: () => void
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
    <Card className="w-full max-w-sm p-6">
      <h1 className="text-xl font-bold text-center mb-6 text-gray-800">{t('auth.register')}</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label={t('auth.displayName')} value={form.display_name} onChange={update('display_name')} />
        <Input label={t('auth.username')} value={form.username} onChange={update('username')} autoFocus />
        <Input label={t('auth.email')} type="email" value={form.email} onChange={update('email')} />
        <Input label={t('auth.password')} type="password" value={form.password} onChange={update('password')} />
        <Input label={t('auth.confirmPassword')} type="password" value={form.password_confirm} onChange={update('password_confirm')} />
        {error && <p className="text-sm text-error">{error}</p>}
        <Button variant="primary" type="submit" className="w-full" disabled={loading}>
          {loading ? t('common.loading') : t('auth.register')}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted">
        {t('auth.hasAccount')}{' '}
        <button onClick={onSwitchToLogin} className="text-accent hover:underline">
          {t('auth.login')}
        </button>
      </p>
    </Card>
  )
}
