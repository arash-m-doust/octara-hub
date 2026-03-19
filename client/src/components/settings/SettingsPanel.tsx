import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  User, Palette, Sun, Moon, Globe,
  Circle, MinusCircle, EyeOff, Clock,
  Check, Loader2
} from 'lucide-react'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

type Tab = 'profile' | 'appearance'

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', icon: Circle, color: 'text-success', fill: 'fill-success' },
  { value: 'idle', label: 'Idle', icon: Clock, color: 'text-warning', fill: '' },
  { value: 'dnd', label: 'Do Not Disturb', icon: MinusCircle, color: 'text-error', fill: '' },
  { value: 'offline', label: 'Invisible', icon: EyeOff, color: 'text-muted', fill: '' },
] as const

const TAB_CONFIG = [
  { key: 'profile' as Tab, label: 'Profile', icon: User },
  { key: 'appearance' as Tab, label: 'Appearance', icon: Palette },
]

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { t, i18n } = useTranslation()
  const { user, updateProfile, fetchMe } = useAuthStore()
  const [tab, setTab] = useState<Tab>('profile')
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<string>('online')
  const [theme, setTheme] = useState<string>('light')
  const [locale, setLocale] = useState<string>('en')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      setDisplayName(user.profile?.display_name || '')
      setStatus(user.profile?.status || 'online')
      setTheme(user.profile?.theme || 'light')
      setLocale(user.profile?.locale || 'en')
    }
  }, [user, isOpen])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      // Single API call with all profile fields including status
      await updateProfile({ display_name: displayName, theme, locale, status })
      await fetchMe()
      setMessage('Settings saved!')
      if (locale !== i18n.language) {
        i18n.changeLanguage(locale)
      }
    } catch (err) {
      console.error('Settings save error:', err)
      setMessage('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      <div className="flex gap-4 min-h-[380px]">
        {/* Sidebar nav */}
        <div className="w-44 flex-shrink-0 border-e border-border-light pe-4 space-y-1">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-skeu text-sm transition-all text-start ${
                tab === key
                  ? 'bg-accent text-white shadow-skeu-raised'
                  : 'hover:bg-surface-inset'
              }`}
              style={tab !== key ? { color: 'var(--color-text-secondary)' } : {}}
            >
              <Icon size={16} />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="space-y-5">
              <Input
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />

              {/* Status selector */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    const isSelected = status === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(opt.value)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-skeu border text-sm transition-all text-start ${
                          isSelected
                            ? 'border-accent bg-accent-soft shadow-skeu-raised'
                            : 'border-border-light hover:bg-surface-inset'
                        }`}
                      >
                        <Icon size={16} className={opt.color} />
                        <span style={{ color: 'var(--color-text-primary)' }}>{opt.label}</span>
                        {isSelected && <Check size={14} className="ml-auto text-accent" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  <Globe size={14} className="text-muted" />
                  Language
                </label>
                <select
                  className="skeu-input"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="fa">فارسی</option>
                </select>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {tab === 'appearance' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Theme</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Light theme card */}
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-3 p-4 rounded-skeu-lg border transition-all ${
                      theme === 'light'
                        ? 'border-accent shadow-skeu-raised ring-2 ring-accent/20'
                        : 'border-border-light hover:bg-surface-inset'
                    }`}
                  >
                    <div className="w-full aspect-[4/3] rounded-skeu bg-[#F5F3F0] border border-[#E8E5E0] p-2 relative overflow-hidden">
                      <div className="w-full h-2 rounded bg-[#FAFAF8] border border-[#E8E5E0] mb-1.5" />
                      <div className="flex gap-1.5 h-full">
                        <div className="w-1/4 rounded bg-[#FAFAF8] border border-[#E8E5E0]" />
                        <div className="flex-1 rounded bg-white border border-[#E8E5E0] p-1.5">
                          <div className="w-3/4 h-1.5 rounded bg-[#DDD9D3] mb-1" />
                          <div className="w-1/2 h-1.5 rounded bg-[#E8E5E0]" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun size={16} className={theme === 'light' ? 'text-accent' : 'text-muted'} />
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Light</span>
                    </div>
                    {theme === 'light' && <Check size={14} className="absolute top-2 right-2 text-accent" />}
                  </button>

                  {/* Dark theme card */}
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-3 p-4 rounded-skeu-lg border transition-all ${
                      theme === 'dark'
                        ? 'border-accent shadow-skeu-raised ring-2 ring-accent/20'
                        : 'border-border-light hover:bg-surface-inset'
                    }`}
                  >
                    <div className="w-full aspect-[4/3] rounded-skeu bg-[#1a1b1e] border border-[#383a40] p-2 relative overflow-hidden">
                      <div className="w-full h-2 rounded bg-[#232428] border border-[#383a40] mb-1.5" />
                      <div className="flex gap-1.5 h-full">
                        <div className="w-1/4 rounded bg-[#232428] border border-[#383a40]" />
                        <div className="flex-1 rounded bg-[#2a2b30] border border-[#383a40] p-1.5">
                          <div className="w-3/4 h-1.5 rounded bg-[#71717a] mb-1" />
                          <div className="w-1/2 h-1.5 rounded bg-[#383a40]" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Moon size={16} className={theme === 'dark' ? 'text-accent' : 'text-muted'} />
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Dark</span>
                    </div>
                    {theme === 'dark' && <Check size={14} className="absolute top-2 right-2 text-accent" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className={`flex items-center gap-2 text-xs mt-3 p-2 rounded-skeu ${
              message.includes('Failed') ? 'text-error bg-error/10' : 'text-success bg-success/10'
            }`}>
              <Check size={14} />
              {message}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-border-light">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </span>
              ) : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
