import { create } from 'zustand'
import * as callsApi from '@/api/calls'
import type { CallSession } from '@/api/calls'

function getMyUserId(): number | null {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) return null
    return JSON.parse(atob(token.split('.')[1])).user_id
  } catch {
    return null
  }
}

interface CallState {
  // Active call state
  activeCall: CallSession | null
  incomingCall: CallSession | null
  localStream: MediaStream | null
  remoteStreams: Map<number, MediaStream>
  peerConnections: Map<number, RTCPeerConnection>
  isMuted: boolean
  isVideoOff: boolean
  callDuration: number
  durationInterval: ReturnType<typeof setInterval> | null
  mediaError: string | null

  // Actions
  startCall: (params: { channel_id?: number; dm_thread_id?: number; call_type: 'voice' | 'video' }) => Promise<void>
  joinCall: (callId: number) => Promise<void>
  leaveCall: () => Promise<void>
  endCall: () => Promise<void>
  declineIncoming: () => Promise<void>
  acceptIncoming: () => Promise<void>
  toggleMute: () => void
  toggleVideo: () => void
  setIncomingCall: (call: CallSession | null) => void
  setActiveCall: (call: CallSession | null) => void
  handleSignal: (data: { from_user_id: number; type: string; payload: unknown; call_id: number }) => void
  handleParticipantJoined: (data: { call_id: number; user: unknown }) => void
  handleParticipantLeft: (data: { call_id: number; user_id: number }) => void
  handleCallEnded: (data: { call_id: number }) => void
  cleanup: () => void
  clearMediaError: () => void
  createPeerConnection: (userId: number, createOffer: boolean, stream: MediaStream) => Promise<RTCPeerConnection | null>
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export const useCallStore = create<CallState>((set, get) => ({
  activeCall: null,
  incomingCall: null,
  localStream: null,
  remoteStreams: new Map(),
  peerConnections: new Map(),
  isMuted: false,
  isVideoOff: false,
  callDuration: 0,
  durationInterval: null,
  mediaError: null,

  startCall: async (params) => {
    try {
      set({ mediaError: null })
      const isVideo = params.call_type === 'video'
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo,
        })
      } catch (mediaErr) {
        const msg = mediaErr instanceof DOMException && mediaErr.name === 'NotAllowedError'
          ? 'Camera/microphone access denied. Please allow access in your browser settings.'
          : 'Could not access camera/microphone. Please check your device.'
        set({ mediaError: msg })
        return
      }

      const call = await callsApi.startCall(params)

      const interval = setInterval(() => {
        set((s) => ({ callDuration: s.callDuration + 1 }))
      }, 1000)

      set({
        activeCall: call,
        localStream: stream,
        isMuted: false,
        isVideoOff: !isVideo,
        callDuration: 0,
        durationInterval: interval,
      })
    } catch (err) {
      console.error('Failed to start call:', err)
    }
  },

  joinCall: async (callId) => {
    try {
      set({ mediaError: null })
      const call = await callsApi.joinCall(callId)
      const isVideo = call.call_type === 'video'

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo,
        })
      } catch (mediaErr) {
        const msg = mediaErr instanceof DOMException && mediaErr.name === 'NotAllowedError'
          ? 'Camera/microphone access denied. Please allow access in your browser settings.'
          : 'Could not access camera/microphone. Please check your device.'
        set({ mediaError: msg })
        return
      }

      const interval = setInterval(() => {
        set((s) => ({ callDuration: s.callDuration + 1 }))
      }, 1000)

      set({
        activeCall: call,
        incomingCall: null,
        localStream: stream,
        isMuted: false,
        isVideoOff: !isVideo,
        callDuration: 0,
        durationInterval: interval,
      })

      // Create peer connections for existing participants and send offers
      const myUserId = getMyUserId()
      for (const p of call.participants) {
        if (p.user.id !== myUserId && !p.left_at) {
          await get().createPeerConnection(p.user.id, true, stream)
        }
      }
    } catch (err) {
      console.error('Failed to join call:', err)
    }
  },

  leaveCall: async () => {
    const { activeCall } = get()
    if (!activeCall) return
    try {
      await callsApi.leaveCall(activeCall.id)
    } catch { /* ignore */ }
    get().cleanup()
  },

  endCall: async () => {
    const { activeCall } = get()
    if (!activeCall) return
    try {
      await callsApi.endCall(activeCall.id)
    } catch { /* ignore */ }
    get().cleanup()
  },

  declineIncoming: async () => {
    const { incomingCall } = get()
    if (!incomingCall) return
    try {
      await callsApi.declineCall(incomingCall.id)
    } catch { /* ignore */ }
    set({ incomingCall: null })
  },

  acceptIncoming: async () => {
    const { incomingCall } = get()
    if (!incomingCall) return
    await get().joinCall(incomingCall.id)
  },

  toggleMute: () => {
    const { localStream, isMuted, activeCall } = get()
    if (!localStream || !activeCall) return

    localStream.getAudioTracks().forEach((t) => {
      t.enabled = isMuted
    })

    const newMuted = !isMuted
    set({ isMuted: newMuted })
    callsApi.toggleMedia(activeCall.id, { is_muted: newMuted })
  },

  toggleVideo: () => {
    const { localStream, isVideoOff, activeCall } = get()
    if (!localStream || !activeCall) return

    localStream.getVideoTracks().forEach((t) => {
      t.enabled = isVideoOff
    })

    const newVideoOff = !isVideoOff
    set({ isVideoOff: newVideoOff })
    callsApi.toggleMedia(activeCall.id, { is_video_off: newVideoOff })
  },

  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call }),
  clearMediaError: () => set({ mediaError: null }),

  handleSignal: async (data) => {
    const { activeCall, localStream, peerConnections } = get()
    if (!activeCall || activeCall.id !== data.call_id || !localStream) return

    const fromUserId = data.from_user_id
    const myUserId = getMyUserId()

    if (data.type === 'offer') {
      const existingPc = peerConnections.get(fromUserId)

      // Polite peer collision handling:
      // If we already sent an offer (have a PC with localDescription type=offer),
      // the user with the HIGHER ID yields and accepts the incoming offer.
      if (existingPc && existingPc.localDescription?.type === 'offer') {
        if (myUserId != null && myUserId > fromUserId) {
          // We are "impolite" — ignore their offer, keep ours
          return
        }
        // We are "polite" — close our PC, accept their offer
        existingPc.close()
        peerConnections.delete(fromUserId)
        set({ peerConnections: new Map(peerConnections) })
      }

      const pc = await get().createPeerConnection(fromUserId, false, localStream)
      if (!pc) return

      await pc.setRemoteDescription(new RTCSessionDescription(data.payload as RTCSessionDescriptionInit))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      callsApi.sendSignal(activeCall.id, {
        type: 'answer',
        payload: answer,
        target_user_id: fromUserId,
      })
    } else if (data.type === 'answer') {
      const pc = peerConnections.get(fromUserId)
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.payload as RTCSessionDescriptionInit))
      }
    } else if (data.type === 'ice-candidate') {
      const pc = peerConnections.get(fromUserId)
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(data.payload as RTCIceCandidateInit))
      }
    }
  },

  handleParticipantJoined: async (data) => {
    const { activeCall, localStream } = get()
    if (!activeCall || activeCall.id !== data.call_id || !localStream) return

    const user = data.user as { id: number }
    const myUserId = getMyUserId()
    if (user.id === myUserId) return

    // Proactively create peer connection and send offer to the new participant.
    // Both sides will attempt to connect; the polite peer collision handler
    // in handleSignal resolves any offer/offer race condition.
    await get().createPeerConnection(user.id, true, localStream)
  },

  handleParticipantLeft: (data) => {
    const { activeCall, peerConnections, remoteStreams } = get()
    if (!activeCall || activeCall.id !== data.call_id) return

    const pc = peerConnections.get(data.user_id)
    if (pc) {
      pc.close()
      peerConnections.delete(data.user_id)
    }
    remoteStreams.delete(data.user_id)
    set({ peerConnections: new Map(peerConnections), remoteStreams: new Map(remoteStreams) })
  },

  handleCallEnded: (data) => {
    const { activeCall } = get()
    if (activeCall && activeCall.id === data.call_id) {
      get().cleanup()
    }
    const { incomingCall } = get()
    if (incomingCall && incomingCall.id === data.call_id) {
      set({ incomingCall: null })
    }
  },

  cleanup: () => {
    const { localStream, peerConnections, durationInterval } = get()

    localStream?.getTracks().forEach((t) => t.stop())
    peerConnections.forEach((pc) => pc.close())

    if (durationInterval) clearInterval(durationInterval)

    set({
      activeCall: null,
      localStream: null,
      remoteStreams: new Map(),
      peerConnections: new Map(),
      isMuted: false,
      isVideoOff: false,
      callDuration: 0,
      durationInterval: null,
    })
  },

  createPeerConnection: async (userId: number, createOffer: boolean, stream: MediaStream) => {
    const { activeCall, peerConnections, remoteStreams } = get()
    if (!activeCall) return null

    // If we already have a connected/connecting PC for this user, skip
    const existingPc = peerConnections.get(userId)
    if (existingPc && !createOffer) {
      // Reuse for incoming offer handling — close old one first
      existingPc.close()
      peerConnections.delete(userId)
    } else if (existingPc && createOffer) {
      // Already have a PC and want to create offer — check state
      if (existingPc.connectionState === 'connected' || existingPc.connectionState === 'connecting') {
        return existingPc
      }
      existingPc.close()
      peerConnections.delete(userId)
    }

    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Add local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream)
    })

    // Handle remote tracks
    pc.ontrack = (event) => {
      const remote = event.streams[0]
      if (remote) {
        const streams = get().remoteStreams
        streams.set(userId, remote)
        set({ remoteStreams: new Map(streams) })
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      const call = get().activeCall
      if (event.candidate && call) {
        callsApi.sendSignal(call.id, {
          type: 'ice-candidate',
          payload: event.candidate.toJSON(),
          target_user_id: userId,
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        pc.close()
        const pcs = get().peerConnections
        const rs = get().remoteStreams
        pcs.delete(userId)
        rs.delete(userId)
        set({ peerConnections: new Map(pcs), remoteStreams: new Map(rs) })
      }
    }

    peerConnections.set(userId, pc)
    set({ peerConnections: new Map(peerConnections) })

    if (createOffer) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      callsApi.sendSignal(activeCall.id, {
        type: 'offer',
        payload: offer,
        target_user_id: userId,
      })
    }

    return pc
  },
}))
