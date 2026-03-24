import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMessageStore } from '@/stores/messageStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Pin, ChevronUp, ChevronDown, X, PinOff } from 'lucide-react'

export function PinnedBanner() {
  const { t } = useTranslation()
  const { pinnedMessages, currentPinIndex, cyclePinIndex, unpinMessage } = useMessageStore()
  const { currentChannel } = useWorkspaceStore()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || pinnedMessages.length === 0 || !currentChannel) return null

  const currentPin = pinnedMessages[currentPinIndex]
  if (!currentPin) return null

  const msg = currentPin.message
  const senderName = msg.user.profile?.display_name || msg.user.username
  const hasMultiple = pinnedMessages.length > 1

  const handleUnpin = async () => {
    await unpinMessage(currentChannel.id, msg.id)
  }

  return (
    <div
      className="flex-shrink-0 flex items-center gap-2 px-4 py-2 mx-3 mt-1 rounded-ind"
      style={{
        background: 'var(--color-surface-inset)',
        border: '1px solid var(--color-border-groove)',
        borderInlineStart: '3px solid var(--color-accent)',
        boxShadow: 'inset 0 1px 3px var(--color-metal-shadow)',
      }}
    >
      {/* Pin icon with glow */}
      <div
        className="w-7 h-7 flex items-center justify-center rounded-ind flex-shrink-0"
        style={{
          background: 'var(--color-accent-soft)',
          color: 'var(--color-accent)',
        }}
      >
        <Pin size={13} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => hasMultiple && cyclePinIndex('next')}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold" style={{ color: 'var(--color-accent)' }}>
            {senderName}
          </span>
          {hasMultiple && (
            <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
              {currentPinIndex + 1}/{pinnedMessages.length}
            </span>
          )}
        </div>
        <p
          className="text-xs truncate mt-0.5"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {msg.content}
        </p>
      </div>

      {/* Navigation arrows (if multiple pins) */}
      {hasMultiple && (
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button
            onClick={() => cyclePinIndex('prev')}
            className="w-5 h-4 flex items-center justify-center rounded-sm transition-colors"
            style={{
              background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
              border: '1px solid var(--color-border)',
              boxShadow: 'inset 0 1px 0 var(--color-metal-highlight)',
              color: 'var(--color-text-muted)',
            }}
          >
            <ChevronUp size={10} />
          </button>
          <button
            onClick={() => cyclePinIndex('next')}
            className="w-5 h-4 flex items-center justify-center rounded-sm transition-colors"
            style={{
              background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
              border: '1px solid var(--color-border)',
              boxShadow: 'inset 0 1px 0 var(--color-metal-highlight)',
              color: 'var(--color-text-muted)',
            }}
          >
            <ChevronDown size={10} />
          </button>
        </div>
      )}

      {/* Unpin button */}
      <button
        onClick={handleUnpin}
        className="w-6 h-6 flex items-center justify-center rounded-ind transition-all flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
          border: '1px solid var(--color-border)',
          boxShadow: 'inset 0 1px 0 var(--color-metal-highlight), 0 1px 2px var(--color-metal-shadow)',
          color: 'var(--color-text-muted)',
        }}
        title={t('chat.unpin')}
      >
        <PinOff size={11} />
      </button>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="w-5 h-5 flex items-center justify-center rounded-ind transition-colors flex-shrink-0 text-muted"
        title="Dismiss"
      >
        <X size={11} />
      </button>
    </div>
  )
}
