import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { AppShell } from '@/components/layout/AppShell'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { ForgotPassword } from '@/components/auth/ForgotPassword'
import { authStorage } from '@/utils/authStorage'

type AuthView = 'login' | 'register' | 'forgot'

export default function App() {
  const { i18n } = useTranslation()
  const { isAuthenticated, fetchMe, logout } = useAuthStore()
  const [authView, setAuthView] = useState<AuthView>('login')
  const [initializing, setInitializing] = useState(() => {
    authStorage.syncUrlWithStoredSession()
    return authStorage.hasAccessToken()
  })
  const [restoreError, setRestoreError] = useState('')
  const initRef = useRef(false)

  const attemptSessionRestore = async () => {
    if (!authStorage.hasAccessToken()) {
      setInitializing(false)
      return
    }

    setInitializing(true)
    setRestoreError('')
    let attempt = 0

    while (attempt < 3) {
      try {
        await fetchMe()
        setRestoreError('')
        setInitializing(false)
        return
      } catch (err: unknown) {
        const status = (
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status?: unknown }).status)
            : null
        )
        if (status === 401 || status === 403) {
          setRestoreError('')
          setInitializing(false)
          return
        }
        attempt += 1
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
          continue
        }
        setRestoreError('Unable to restore session right now. Your session is kept.')
      }
    }

    setInitializing(false)
  }

  // Set document direction based on language
  useEffect(() => {
    const dir = i18n.language === 'fa' ? 'rtl' : 'ltr'
    document.documentElement.dir = dir
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  // Try to restore session on mount (runs only once)
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    if (authStorage.hasAccessToken()) {
      void attemptSessionRestore()
    } else {
      setInitializing(false)
    }
  }, [fetchMe])

  // Show loading only during initial session restore
  if (initializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && authStorage.hasAccessToken()) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-center space-y-3 max-w-sm px-4">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted">Restoring session...</p>
          {restoreError && (
            <p className="text-xs text-error">{restoreError}</p>
          )}
          <div className="flex items-center justify-center gap-2">
            <button className="ind-button text-xs" onClick={() => void attemptSessionRestore()}>
              Retry
            </button>
            <button className="ind-button text-xs" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface p-4">
        <div className="w-full max-w-sm">
          {/* Language Toggle */}
          <div className="flex justify-center gap-2 mb-6">
            <button
              onClick={() => i18n.changeLanguage('en')}
              className={`text-xs px-2 py-1 rounded ${i18n.language === 'en' ? 'bg-accent text-white' : 'text-muted hover:text-gray-600'}`}
            >
              English
            </button>
            <button
              onClick={() => i18n.changeLanguage('fa')}
              className={`text-xs px-2 py-1 rounded ${i18n.language === 'fa' ? 'bg-accent text-white' : 'text-muted hover:text-gray-600'}`}
            >
              Farsi
            </button>
          </div>

          {authView === 'login' && (
            <LoginForm
              onSwitchToRegister={() => setAuthView('register')}
              onSwitchToForgot={() => setAuthView('forgot')}
            />
          )}
          {authView === 'register' && (
            <RegisterForm onSwitchToLogin={() => setAuthView('login')} />
          )}
          {authView === 'forgot' && (
            <ForgotPassword onBack={() => setAuthView('login')} />
          )}
        </div>
      </div>
    )
  }

  return <AppShell />
}
