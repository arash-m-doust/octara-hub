import { useTranslation } from 'react-i18next'
import { useCallStore } from '@/stores/callStore'
import { Phone, Video, AlertTriangle } from 'lucide-react'

interface CallButtonProps {
  channelId?: number
  dmThreadId?: number
}

export function CallButton({ channelId, dmThreadId }: CallButtonProps) {
  const { t } = useTranslation()
  const { activeCall, startCall, mediaError, clearMediaError } = useCallStore()

  const handleVoiceCall = () => {
    if (activeCall) return
    startCall({
      channel_id: channelId,
      dm_thread_id: dmThreadId,
      call_type: 'voice',
    })
  }

  const handleVideoCall = () => {
    if (activeCall) return
    startCall({
      channel_id: channelId,
      dm_thread_id: dmThreadId,
      call_type: 'video',
    })
  }

  const inCall = !!activeCall

  return (
    <div className="flex items-center gap-1 relative">
      <button
        onClick={handleVoiceCall}
        disabled={inCall}
        className="w-7 h-7 flex items-center justify-center rounded-ind ind-button p-0"
        style={{
          opacity: inCall ? 0.5 : 1,
          color: 'var(--color-text-muted)',
        }}
        title={t('call.startVoice')}
      >
        <Phone size={14} />
      </button>
      <button
        onClick={handleVideoCall}
        disabled={inCall}
        className="w-7 h-7 flex items-center justify-center rounded-ind ind-button p-0"
        style={{
          opacity: inCall ? 0.5 : 1,
          color: 'var(--color-text-muted)',
        }}
        title={t('call.startVideo')}
      >
        <Video size={14} />
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
