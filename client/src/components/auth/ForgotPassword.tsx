import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/api/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface ForgotPasswordProps {
  onBack: () => void
}

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm p-6">
      <h1 className="text-xl font-bold text-center mb-6 text-gray-800">{t('auth.forgotPassword')}</h1>
      {sent ? (
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-600">If the email exists, a reset link was sent.</p>
          <Button variant="ghost" onClick={onBack}>{t('auth.login')}</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t('auth.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          <Button variant="primary" type="submit" className="w-full" disabled={loading}>
            {loading ? t('common.loading') : t('auth.sendResetLink')}
          </Button>
          <button onClick={onBack} className="block mx-auto text-xs text-accent hover:underline">
            {t('auth.login')}
          </button>
        </form>
      )}
    </Card>
  )
}
