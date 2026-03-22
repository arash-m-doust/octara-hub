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
  { value: 'online', label: 'Online', icon: Circle, color: 'var(--color-led-online)' },
  { value: 'idle', label: 'Idle', icon: Clock, color: 'var(--color-led-idle)' },
  { value: 'dnd', label: 'Do Not Disturb', icon: MinusCircle, color: 'var(--color-led-dnd)' },
  { value: 'offline', label: 'Invisible', icon: EyeOff, color: 'var(--color-led-off)' },
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
        <div className="w-44 flex-shrink-0 pe-4 space-y-1" style={{ borderInlineEnd: '2px solid transparent', borderImage: 'linear-gradient(180deg, var(--color-border-groove), var(--color-metal-highlight), var(--color-border-groove)) 1' }}>
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-ind text-sm transition-all text-start"
              style={{
                background: tab === key
                  ? 'linear-gradient(180deg, var(--color-surface-inset) 0%, var(--color-surface) 100%)'
                  : 'transparent',
                border: tab === key ? '1px solid var(--color-accent)' : '1px solid transparent',
                boxShadow: tab === key ? 'inset 0 2px 4px var(--color-metal-shadow), 0 0 6px var(--color-accent-glow)' : 'none',
                color: tab === key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontWeight: tab === key ? 600 : 400,
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
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

              {/* Status selector with LED indicators */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-secondary)' }}>Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    const isSelected = status === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(opt.value)}
                        className="flex items-center gap-2.5 p-2.5 rounded-ind text-sm transition-all text-start"
                        style={{
                          background: isSelected
                            ? 'linear-gradient(180deg, var(--color-surface-inset) 0%, var(--color-surface) 100%)'
                            : 'var(--color-surface-inset)',
                          border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          boxShadow: isSelected
                            ? 'inset 0 2px 4px var(--color-metal-shadow), 0 0 6px var(--color-accent-glow)'
                            : 'inset 0 1px 3px var(--color-metal-shadow)',
                        }}
                      >
                        {/* LED dot */}
                        <span
                          className="ind-led"
                          style={{
                            backgroundColor: opt.color,
                            boxShadow: opt.value !== 'offline' ? `0 0 4px ${opt.color}, 0 0 8px ${opt.color}` : 'none',
                          }}
                        />
                        <span style={{ color: 'var(--color-text-primary)' }}>{opt.label}</span>
                        {isSelected && <Check size={14} className="ml-auto" style={{ color: 'var(--color-accent)' }} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  <Globe size={14} className="text-muted" />
                  Language
                </label>
                <select
                  className="ind-input"
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
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-secondary)' }}>Theme</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Light theme — Brushed Aluminum */}
                  <button
                    onClick={() => setTheme('light')}
                    className="flex flex-col items-center gap-3 p-4 rounded-ind-lg transition-all relative"
                    style={{
                      background: theme === 'light'
                        ? 'linear-gradient(180deg, var(--color-surface-inset) 0%, var(--color-surface) 100%)'
                        : 'var(--color-surface-inset)',
                      border: `1px solid ${theme === 'light' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      boxShadow: theme === 'light'
                        ? 'inset 0 2px 4px var(--color-metal-shadow), 0 0 8px var(--color-accent-glow)'
                        : 'inset 0 1px 3px var(--color-metal-shadow)',
                    }}
                  >
                    <div className="w-full aspect-[4/3] rounded-ind bg-[#c8c8cc] border border-[#a0a0a8] p-2 overflow-hidden">
                      <div className="w-full h-2 rounded-sm bg-[#d6d6da] border border-[#b8b8bf] mb-1.5" />
                      <div className="flex gap-1.5 h-full">
                        <div className="w-1/4 rounded-sm bg-[#bfc0c5] border border-[#a0a0a8]" />
                        <div className="flex-1 rounded-sm bg-[#d2d2d6] border border-[#b8b8bf] p-1.5">
                          <div className="w-3/4 h-1.5 rounded-sm bg-[#a0a0a8] mb-1" />
                          <div className="w-1/2 h-1.5 rounded-sm bg-[#b8b8bf]" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun size={16} style={{ color: theme === 'light' ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Aluminum</span>
                    </div>
                  </button>

                  {/* Dark theme — Gunmetal Steel */}
                  <button
                    onClick={() => setTheme('dark')}
                    className="flex flex-col items-center gap-3 p-4 rounded-ind-lg transition-all relative"
                    style={{
                      background: theme === 'dark'
                        ? 'linear-gradient(180deg, var(--color-surface-inset) 0%, var(--color-surface) 100%)'
                        : 'var(--color-surface-inset)',
                      border: `1px solid ${theme === 'dark' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      boxShadow: theme === 'dark'
                        ? 'inset 0 2px 4px var(--color-metal-shadow), 0 0 8px var(--color-accent-glow)'
                        : 'inset 0 1px 3px var(--color-metal-shadow)',
                    }}
                  >
                    <div className="w-full aspect-[4/3] rounded-ind bg-[#2a2a30] border border-[#404048] p-2 overflow-hidden">
                      <div className="w-full h-2 rounded-sm bg-[#353540] border border-[#48484f] mb-1.5" />
                      <div className="flex gap-1.5 h-full">
                        <div className="w-1/4 rounded-sm bg-[#30303a] border border-[#404048]" />
                        <div className="flex-1 rounded-sm bg-[#2e2e34] border border-[#404048] p-1.5">
                          <div className="w-3/4 h-1.5 rounded-sm bg-[#6a6a74] mb-1" />
                          <div className="w-1/2 h-1.5 rounded-sm bg-[#48484f]" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Moon size={16} style={{ color: theme === 'dark' ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Gunmetal</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div
              className="flex items-center gap-2 text-xs mt-3 p-2 rounded-ind"
              style={{
                background: message.includes('Failed') ? 'rgba(255,82,82,0.1)' : 'rgba(0,230,118,0.1)',
                color: message.includes('Failed') ? '#FF5252' : 'var(--color-led-online)',
                border: `1px solid ${message.includes('Failed') ? 'rgba(255,82,82,0.3)' : 'rgba(0,230,118,0.3)'}`,
              }}
            >
              <Check size={14} />
              {message}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-5 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
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
