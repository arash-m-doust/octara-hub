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
  const { isAuthenticated, user, fetchMe, logout } = useAuthStore()
  const [authView, setAuthView] = useState<AuthView>('login')
  const [initializing, setInitializing] = useState(authStorage.hasAccessToken())
  const initRef = useRef(false)

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
    // Keep URL session key aligned with tab storage before auth check.
    authStorage.syncUrlWithStoredSession()

    if (authStorage.hasAccessToken()) {
      fetchMe().finally(() => setInitializing(false))
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
              فارسی
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
