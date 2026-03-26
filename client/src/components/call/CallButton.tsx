import { useTranslation } from 'react-i18next'
import { useCallStore } from '@/stores/callStore'
import { Phone, AlertTriangle } from 'lucide-react'

interface CallButtonProps {
  channelId?: number
  dmThreadId?: number
}

export function CallButton({ channelId, dmThreadId }: CallButtonProps) {
  const { t } = useTranslation()
  const { activeCall, startCall, mediaError, clearMediaError } = useCallStore()

  const handleJoinCall = () => {
    if (activeCall) return
    // Start as voice call — user can toggle camera on from the overlay
    startCall({
      channel_id: channelId,
      dm_thread_id: dmThreadId,
      call_type: 'voice',
    })
  }

  const inCall = !!activeCall

  return (
    <div className="flex items-center gap-1 relative">
      <button
        onClick={handleJoinCall}
        disabled={inCall}
        className="h-7 px-2.5 flex items-center gap-1.5 rounded-ind ind-button text-xs font-medium"
        style={{
          opacity: inCall ? 0.5 : 1,
          color: inCall ? 'var(--color-text-muted)' : 'var(--color-led-online)',
        }}
        title={t('call.join')}
      >
        <Phone size={13} />
        <span className="hidden sm:inline">{t('call.join')}</span>
      </button>

      {/* Media error tooltip */}
      {mediaError && (
        <div
          className="absolute top-full end-0 mt-2 z-50 w-64 p-2.5 rounded-ind text-xs"
          style={{
            background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface-plate) 100%)',
            border: '1px solid #FF5252',
            boxShadow: '0 4px 12px var(--color-metal-shadow)',
            color: '#FF5252',
          }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{mediaError}</p>
              <button
                onClick={clearMediaError}
                className="mt-1.5 text-[10px] underline"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
