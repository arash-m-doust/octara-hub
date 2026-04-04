import { useMemo, useState, useRef, useEffect } from 'react'
import { Smile } from 'lucide-react'
import { EMOJI_CATEGORIES } from '@/constants/emojiCatalog'

const RECENT_EMOJI_STORAGE_KEY = 'octara_hub_recent_emojis'
const RECENT_LIMIT = 24

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  position?: 'top' | 'bottom'
  compact?: boolean
  title?: string
}

function readRecentEmojis(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_EMOJI_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, RECENT_LIMIT)
  } catch {
    return []
  }
}

function writeRecentEmojis(emoji: string) {
  if (typeof window === 'undefined') return
  const next = [emoji, ...readRecentEmojis().filter((item) => item !== emoji)].slice(0, RECENT_LIMIT)
  window.localStorage.setItem(RECENT_EMOJI_STORAGE_KEY, JSON.stringify(next))
}

export function EmojiPicker({ onSelect, position = 'top', compact = false, title = 'Emoji' }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [recentEmojis, setRecentEmojis] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>(EMOJI_CATEGORIES[0].key)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setRecentEmojis(readRecentEmojis())
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const categories = useMemo(() => {
    if (recentEmojis.length === 0) return EMOJI_CATEGORIES
    return [
      {
        key: 'recent',
        label: 'Recent',
        icon: '🕘',
        emojis: recentEmojis,
      },
      ...EMOJI_CATEGORIES,
    ]
  }, [recentEmojis])

  const activeCategory = categories.find((category) => category.key === activeTab) ?? categories[0]

  const handleSelect = (emoji: string) => {
    writeRecentEmojis(emoji)
    setRecentEmojis((prev) => [emoji, ...prev.filter((item) => item !== emoji)].slice(0, RECENT_LIMIT))
    onSelect(emoji)
    setIsOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${compact ? 'w-6 h-6 text-xs' : 'w-8 h-8'} flex items-center justify-center rounded-ind ind-button p-0 text-muted`}
        title={title}
        aria-label={title}
      >
        <Smile size={compact ? 13 : 14} />
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
            className="w-[356px] max-w-[92vw] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface-plate) 100%)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              boxShadow: '0 12px 30px var(--color-metal-shadow), inset 0 1px 0 var(--color-metal-highlight), 0 0 14px var(--color-accent-glow)',
            }}
          >
            <div
              className="flex items-center gap-1 p-2 overflow-x-auto"
              style={{ borderBottom: '1px solid var(--color-border-groove)', scrollbarWidth: 'thin' }}
            >
              {categories.map((category) => {
                const active = category.key === activeCategory.key
                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => setActiveTab(category.key)}
                    title={category.label}
                    className="px-2.5 h-8 rounded-ind inline-flex items-center gap-1.5 transition-all whitespace-nowrap"
                    style={{
                      background: active ? 'var(--color-accent-soft)' : 'transparent',
                      color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      border: active ? '1px solid var(--color-accent)' : '1px solid transparent',
                    }}
                  >
                    <span className="text-base leading-none">{category.icon}</span>
                    <span className="text-[11px]">{category.label}</span>
                  </button>
                )
              })}
            </div>

            <div
              className="grid grid-cols-8 gap-1.5 p-2.5 max-h-64 overflow-y-auto"
              style={{
                background: 'var(--color-surface-inset)',
                boxShadow: 'inset 0 2px 4px var(--color-metal-shadow)',
              }}
            >
              {activeCategory.emojis.map((emoji) => (
                <button
                  key={`${activeCategory.key}-${emoji}`}
                  type="button"
                  onClick={() => handleSelect(emoji)}
                  className="w-9 h-9 rounded-ind text-lg inline-flex items-center justify-center transition-all"
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

