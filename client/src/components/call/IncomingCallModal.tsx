import { useTranslation } from 'react-i18next'
import { useCallStore } from '@/stores/callStore'
import { Phone, PhoneOff, Video } from 'lucide-react'

export function IncomingCallModal() {
  const { t } = useTranslation()
  const { incomingCall, acceptIncoming, declineIncoming } = useCallStore()

  if (!incomingCall) return null

  const caller = incomingCall.initiator
  const callerName = caller.profile?.display_name || caller.username
  const isVideo = incomingCall.call_type === 'video'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-80 flex flex-col items-center gap-6 py-8 px-6"
        style={{
          background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 60%, var(--color-surface-plate) 100%)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 var(--color-metal-highlight), 0 0 40px var(--color-accent-glow)',
          animation: 'incoming-ring 1.5s ease-in-out infinite',
        }}
      >
        {/* Pulsing ring icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, var(--color-accent) 0%, color-mix(in srgb, var(--color-accent) 70%, black) 100%)',
            boxShadow: '0 0 24px var(--color-accent-glow), 0 4px 12px var(--color-metal-shadow)',
            animation: 'led-pulse 1.5s ease-in-out infinite',
          }}
        >
          {isVideo ? <Video size={32} color="#fff" /> : <Phone size={32} color="#fff" />}
        </div>

        {/* Caller info */}
        <div className="text-center">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {callerName}
          </h3>
          <p className="ind-label mt-1">
            {isVideo ? t('call.incomingVideo') : t('call.incomingVoice')}
          </p>
        </div>

        {/* Accept / Decline buttons */}
        <div className="flex items-center gap-6">
          {/* Decline */}
          <button
            onClick={declineIncoming}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
            style={{
              background: 'linear-gradient(180deg, #f44336 0%, #c62828 100%)',
              border: '1px solid #b71c1c',
              boxShadow: '0 0 16px rgba(244,67,54,0.4), inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px var(--color-metal-shadow)',
              color: '#fff',
            }}
            title={t('call.decline')}
          >
            <PhoneOff size={24} />
          </button>

          {/* Accept */}
          <button
            onClick={acceptIncoming}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
            style={{
              background: 'linear-gradient(180deg, #4CAF50 0%, #2E7D32 100%)',
              border: '1px solid #1B5E20',
              boxShadow: '0 0 16px rgba(76,175,80,0.4), inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px var(--color-metal-shadow)',
              color: '#fff',
            }}
            title={t('call.accept')}
          >
            <Phone size={24} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes incoming-ring {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  )
}
