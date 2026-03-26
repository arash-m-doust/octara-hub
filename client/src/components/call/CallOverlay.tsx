import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCallStore } from '@/stores/callStore'
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff,
  Maximize2, Minimize2
} from 'lucide-react'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function CallOverlay() {
  const { t } = useTranslation()
  const {
    activeCall, localStream, remoteStreams, isMuted, isVideoOff,
    callDuration, toggleMute, toggleVideo, leaveCall, endCall,
  } = useCallStore()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, isVideoOff])

  if (!activeCall) return null

  const participantCount = activeCall.participants?.filter((p) => !p.left_at).length || 1
  const hasVideo = !isVideoOff || Array.from(remoteStreams.values()).some((s) => s.getVideoTracks().length > 0)

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 end-4 z-50 cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div
          className="ind-panel-raised flex items-center gap-3 px-4 py-3"
          style={{
            background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface-plate) 100%)',
            borderColor: 'var(--color-accent)',
            boxShadow: '0 4px 20px var(--color-metal-shadow), 0 0 12px var(--color-accent-glow)',
          }}
        >
          {/* Pulsing LED */}
          <span
            className="ind-led ind-led-on ind-led-pulse"
            style={{ backgroundColor: 'var(--color-led-online)', width: 10, height: 10 }}
          />
          <div>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('call.inCall')}
            </span>
            <span className="text-xs ms-2" style={{ color: 'var(--color-accent)' }}>
              {formatDuration(callDuration)}
            </span>
          </div>
          <Maximize2 size={14} style={{ color: 'var(--color-text-muted)' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      {/* Main call panel */}
      <div
        className="w-full max-w-3xl mx-4 flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 60%, var(--color-surface-plate) 100%)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 var(--color-metal-highlight), 0 0 30px var(--color-accent-glow)',
        }}
      >
        {/* Header strip */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface-plate) 100%)',
            borderBottom: '1px solid var(--color-border-groove)',
            boxShadow: 'inset 0 1px 0 var(--color-metal-highlight)',
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="ind-led ind-led-on ind-led-pulse"
              style={{ backgroundColor: 'var(--color-led-online)', width: 10, height: 10 }}
            />
            <div>
              <span className="ind-label">
                {t('call.inCall')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono" style={{ color: 'var(--color-accent)' }}>
              {formatDuration(callDuration)}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {participantCount} {t('call.participants')}
            </span>
            <button
              onClick={() => setIsMinimized(true)}
              className="ind-button p-1.5"
              title={t('call.minimize')}
            >
              <Minimize2 size={14} />
            </button>
          </div>
        </div>

        {/* Video / Audio area */}
        <div
          className="relative flex-1 min-h-[300px] flex items-center justify-center"
          style={{
            background: 'var(--color-surface-inset)',
            boxShadow: 'inset 0 2px 8px var(--color-metal-shadow)',
          }}
        >
          {hasVideo ? (
            <div className="w-full h-full flex flex-wrap items-center justify-center gap-3 p-4">
              {/* Remote streams */}
              {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
                <RemoteVideo key={userId} stream={stream} userId={userId} />
              ))}

              {/* If no remote streams yet, show waiting state */}
              {remoteStreams.size === 0 && (
                <div className="flex flex-col items-center gap-4">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
                      border: '2px solid var(--color-border)',
                      boxShadow: '0 4px 12px var(--color-metal-shadow), inset 0 1px 0 var(--color-metal-highlight)',
                    }}
                  >
                    <Phone size={36} style={{ color: 'var(--color-accent)' }} className="animate-pulse" />
                  </div>
                  <span className="ind-label">{t('call.connecting')}</span>
                </div>
              )}

              {/* Local video (small overlay) */}
              {!isVideoOff && (
                <div
                  className="absolute bottom-4 end-4 w-40 h-30 rounded-lg overflow-hidden"
                  style={{
                    border: '2px solid var(--color-accent)',
                    boxShadow: '0 4px 12px var(--color-metal-shadow), 0 0 8px var(--color-accent-glow)',
                  }}
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Voice-only call: show participant avatars */
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="flex items-center gap-6 flex-wrap justify-center">
                {activeCall.participants?.filter((p) => !p.left_at).map((p) => (
                  <VoiceParticipant key={p.id} participant={p} />
                ))}
              </div>
              {remoteStreams.size === 0 && (
                <span className="ind-label">{t('call.connecting')}</span>
              )}
            </div>
          )}
        </div>

        {/* Control bar — riveted metal strip */}
        <div
          className="flex items-center justify-center gap-3 px-6 py-4"
          style={{
            background: 'linear-gradient(180deg, var(--color-surface-plate) 0%, var(--color-surface) 100%)',
            borderTop: '1px solid var(--color-border-groove)',
            boxShadow: 'inset 0 1px 0 var(--color-metal-highlight)',
          }}
        >
          {/* Mute button */}
          <button
            onClick={toggleMute}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            style={{
              background: isMuted
                ? 'linear-gradient(180deg, var(--color-led-dnd) 0%, #c62828 100%)'
                : 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
              border: `1px solid ${isMuted ? '#c62828' : 'var(--color-border)'}`,
              boxShadow: isMuted
                ? '0 0 12px rgba(255,82,82,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                : 'inset 0 1px 0 var(--color-metal-highlight), 0 2px 4px var(--color-metal-shadow)',
              color: isMuted ? '#fff' : 'var(--color-text-primary)',
            }}
            title={isMuted ? t('call.unmute') : t('call.mute')}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Video toggle — always available (Discord-style) */}
          <button
            onClick={toggleVideo}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            style={{
              background: isVideoOff
                ? 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)'
                : 'linear-gradient(180deg, var(--color-led-online) 0%, #2e7d32 100%)',
              border: `1px solid ${isVideoOff ? 'var(--color-border)' : '#2e7d32'}`,
              boxShadow: isVideoOff
                ? 'inset 0 1px 0 var(--color-metal-highlight), 0 2px 4px var(--color-metal-shadow)'
                : '0 0 12px rgba(76,175,80,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              color: isVideoOff ? 'var(--color-text-primary)' : '#fff',
            }}
            title={isVideoOff ? t('call.cameraOn') : t('call.cameraOff')}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          {/* End call button */}
          <button
            onClick={endCall}
            className="w-14 h-12 rounded-full flex items-center justify-center transition-all"
            style={{
              background: 'linear-gradient(180deg, #f44336 0%, #c62828 100%)',
              border: '1px solid #b71c1c',
              boxShadow: '0 0 16px rgba(244,67,54,0.4), inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px var(--color-metal-shadow)',
              color: '#fff',
            }}
            title={t('call.endCall')}
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Small remote video tile */
function RemoteVideo({ stream, userId }: { stream: MediaStream; userId: number }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream
    }
  }, [stream])

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{
        width: 320,
        height: 240,
        border: '2px solid var(--color-border)',
        boxShadow: '0 4px 12px var(--color-metal-shadow), inset 0 1px 0 var(--color-metal-highlight)',
      }}
    >
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
    </div>
  )
}

/** Voice call participant avatar with LED ring */
function VoiceParticipant({ participant }: { participant: { id: number; user: { id: number; username: string; profile?: { display_name?: string } }; is_muted: boolean } }) {
  const name = participant.user.profile?.display_name || participant.user.username
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold relative"
        style={{
          background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)',
          border: '3px solid var(--color-accent)',
          boxShadow: '0 0 16px var(--color-accent-glow), inset 0 1px 0 var(--color-metal-highlight), 0 4px 8px var(--color-metal-shadow)',
          color: 'var(--color-text-primary)',
        }}
      >
        {initial}
        {/* Muted indicator */}
        {participant.is_muted && (
          <div
            className="absolute -bottom-1 -end-1 w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, var(--color-led-dnd) 0%, #c62828 100%)',
              border: '2px solid var(--color-surface)',
            }}
          >
            <MicOff size={10} color="#fff" />
          </div>
        )}
      </div>
      <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{name}</span>
    </div>
  )
}
