import { useState, useRef, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Smile, Heart, Sparkles, ThumbsUp } from 'lucide-react'

const MINIMAL_EMOJIS = {
  reactions: ['👍', '❤️', '🔥', '👏', '🎉', '✅'],
  emotions: ['🙂', '😊', '😄', '😂', '😅', '🙏'],
  misc: ['💡', '🚀', '⭐', '🎯', '👀', '🤝'],
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  position?: 'top' | 'bottom'
}

export function EmojiPicker({ onSelect, position = 'top' }: EmojiPickerProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<keyof typeof MINIMAL_EMOJIS>('reactions')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const tabs: Array<{ key: keyof typeof MINIMAL_EMOJIS; icon: ReactNode; label: string }> = [
    { key: 'reactions', icon: <ThumbsUp size={13} />, label: 'Reactions' },
    { key: 'emotions', icon: <Heart size={13} />, label: 'Emotions' },
    { key: 'misc', icon: <Sparkles size={13} />, label: 'Misc' },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-8 h-8 flex items-center justify-center rounded-ind ind-button p-0 text-muted"
        title={t('chat.reactions')}
      >
        <Smile size={14} />
      </button>

      {isOpen && (
        <div
          className="absolute z-50 end-0"
          style={{
            [position === 'top' ? 'bottom' : 'top']: '100%',
            marginBottom: position === 'top' ? 8 : 0,
            marginTop: position === 'bottom' ? 8 : 0,
          }}
        >
          <div
            className="w-56 overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface-plate) 100%)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              boxShadow: '0 8px 30px var(--color-metal-shadow), inset 0 1px 0 var(--color-metal-highlight), 0 0 12px var(--color-accent-glow)',
            }}
          >
            <div className="flex items-center gap-1 p-2" style={{ borderBottom: '1px solid var(--color-border-groove)' }}>
              {tabs.map((tab) => {
                const active = tab.key === activeTab
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    title={tab.label}
                    className="w-8 h-8 rounded-ind inline-flex items-center justify-center transition-all"
                    style={{
                      background: active ? 'var(--color-accent-soft)' : 'transparent',
                      color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      border: active ? '1px solid var(--color-accent)' : '1px solid transparent',
                    }}
                  >
                    {tab.icon}
                  </button>
                )
              })}
            </div>

            <div
              className="grid grid-cols-6 gap-1 p-2"
              style={{ background: 'var(--color-surface-inset)', boxShadow: 'inset 0 2px 4px var(--color-metal-shadow)' }}
            >
              {MINIMAL_EMOJIS[activeTab].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSelect(emoji)
                    setIsOpen(false)
                  }}
                  className="w-8 h-8 rounded-ind text-base inline-flex items-center justify-center transition-all"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-surface-plate)'
                    e.currentTarget.style.boxShadow = 'inset 0 1px 0 var(--color-metal-highlight), 0 1px 2px var(--color-metal-shadow)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

