import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Smile } from 'lucide-react'

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    label: 'Smileys',
    icon: '😊',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
      '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🫡',
      '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬',
      '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸',
      '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '😮', '😯', '😲',
      '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
      '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡',
      '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺',
    ],
  },
  {
    id: 'gestures',
    label: 'Gestures',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌',
      '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉',
      '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛',
      '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '💪', '🦾',
    ],
  },
  {
    id: 'hearts',
    label: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟',
      '♥️', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬',
    ],
  },
  {
    id: 'objects',
    label: 'Objects',
    icon: '🎉',
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🎀', '🏆', '🥇', '🥈', '🥉', '⚽',
      '🏀', '🎮', '🎯', '🎲', '🔔', '🎵', '🎶', '🎤', '🎧', '📱',
      '💻', '⌨️', '🖥️', '🖨️', '📷', '📹', '🎬', '📺', '📻', '🔍',
      '💡', '🔦', '📖', '📝', '✏️', '📌', '📎', '🔑', '🔒', '🔓',
    ],
  },
  {
    id: 'food',
    label: 'Food',
    icon: '🍕',
    emojis: [
      '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒',
      '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍕', '🍔', '🍟',
      '🌭', '🍿', '🧁', '🍰', '🎂', '🍩', '🍪', '🍫', '🍬', '☕',
    ],
  },
  {
    id: 'nature',
    label: 'Nature',
    icon: '🌿',
    emojis: [
      '🌸', '🌹', '🌺', '🌻', '🌼', '🌷', '🪻', '🌱', '🌲', '🌳',
      '🌴', '🌵', '🍀', '🍁', '🍂', '🍃', '🌿', '☘️', '🪴', '🌈',
      '☀️', '🌤️', '⛅', '🌧️', '⛈️', '🌩️', '❄️', '🌊', '🔥', '⭐',
    ],
  },
  {
    id: 'animals',
    label: 'Animals',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦅', '🦉',
      '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🦋', '🐌', '🐞',
    ],
  },
]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  position?: 'top' | 'bottom'
}

export function EmojiPicker({ onSelect, position = 'top' }: EmojiPickerProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('smileys')
  const [search, setSearch] = useState('')
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

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0]

  // Filter emojis by search (basic unicode name matching isn't possible, so we just show all or filter categories)
  const displayEmojis = search
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    : currentCategory.emojis

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
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
            className="w-72 overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface-plate) 100%)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              boxShadow: '0 8px 30px var(--color-metal-shadow), inset 0 1px 0 var(--color-metal-highlight), 0 0 12px var(--color-accent-glow)',
            }}
          >
            {/* Search */}
            <div className="p-2">
              <input
                type="text"
                className="ind-input text-xs"
                placeholder={t('search.placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Category tabs */}
            {!search && (
              <div
                className="flex items-center gap-0.5 px-2 pb-1"
                style={{ borderBottom: '1px solid var(--color-border-groove)' }}
              >
                {EMOJI_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-ind text-sm transition-all"
                    style={{
                      background: activeCategory === cat.id
                        ? 'var(--color-accent-soft)'
                        : 'transparent',
                      border: activeCategory === cat.id
                        ? '1px solid var(--color-accent)'
                        : '1px solid transparent',
                      boxShadow: activeCategory === cat.id
                        ? '0 0 4px var(--color-accent-glow)'
                        : 'none',
                    }}
                    title={cat.label}
                  >
                    {cat.icon}
                  </button>
                ))}
              </div>
            )}

            {/* Emoji grid */}
            <div
              className="grid grid-cols-8 gap-0.5 p-2 overflow-y-auto max-h-48"
              style={{
                background: 'var(--color-surface-inset)',
                boxShadow: 'inset 0 2px 4px var(--color-metal-shadow)',
              }}
            >
              {displayEmojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onClick={() => {
                    onSelect(emoji)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-ind text-lg hover:scale-110 transition-transform"
                  style={{
                    background: 'transparent',
                  }}
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
