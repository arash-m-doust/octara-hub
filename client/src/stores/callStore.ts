import { create } from 'zustand'
import * as callsApi from '@/api/calls'
import type { CallSession } from '@/api/calls'

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

  startCall: async (params) => {
    try {
      const isVideo = params.call_type === 'video'
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      })

      const call = await callsApi.startCall(params)

      // Start duration timer
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
      const call = await callsApi.joinCall(callId)
      const isVideo = call.call_type === 'video'

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      })

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

      // Create peer connections for existing participants
      const myUserId = JSON.parse(atob(localStorage.getItem('access_token')!.split('.')[1])).user_id
      for (const p of call.participants) {
        if (p.user.id !== Number(myUserId) && !p.left_at) {
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
      t.enabled = isMuted // toggle: if muted, enable; if unmuted, disable
    })

    const newMuted = !isMuted
    set({ isMuted: newMuted })
    callsApi.toggleMedia(activeCall.id, { is_muted: newMuted })
  },

  toggleVideo: () => {
    const { localStream, isVideoOff, activeCall } = get()
    if (!localStream || !activeCall) return

    localStream.getVideoTracks().forEach((t) => {
      t.enabled = isVideoOff // toggle
    })

    const newVideoOff = !isVideoOff
    set({ isVideoOff: newVideoOff })
    callsApi.toggleMedia(activeCall.id, { is_video_off: newVideoOff })
  },

  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call }),

  handleSignal: async (data) => {
    const { activeCall, localStream, peerConnections } = get()
    if (!activeCall || activeCall.id !== data.call_id) return

    const fromUserId = data.from_user_id

    if (data.type === 'offer') {
      // Create a peer connection if we don't have one
      const pc = await get().createPeerConnection(fromUserId, false, localStream!)
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
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.payload as RTCSessionDescriptionInit))
      }
    } else if (data.type === 'ice-candidate') {
      const pc = peerConnections.get(fromUserId)
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(data.payload as RTCIceCandidateInit))
      }
    }
  },

  handleParticipantJoined: async (data) => {
    const { activeCall, localStream } = get()
    if (!activeCall || activeCall.id !== data.call_id || !localStream) return

    const user = data.user as { id: number }
    // The new participant will send an offer, so we wait for signal
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
    // Also clear incoming if it matches
    const { incomingCall } = get()
    if (incomingCall && incomingCall.id === data.call_id) {
      set({ incomingCall: null })
    }
  },

  cleanup: () => {
    const { localStream, peerConnections, durationInterval } = get()

    // Stop all tracks
    localStream?.getTracks().forEach((t) => t.stop())

    // Close all peer connections
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

  // Helper: not in the interface, but used internally
  createPeerConnection: async (userId: number, createOffer: boolean, stream: MediaStream) => {
    const { activeCall, peerConnections, remoteStreams } = get()
    if (!activeCall) return null

    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Add local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream)
    })

    // Handle remote tracks
    pc.ontrack = (event) => {
      const remote = event.streams[0]
      if (remote) {
        remoteStreams.set(userId, remote)
        set({ remoteStreams: new Map(remoteStreams) })
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && activeCall) {
        callsApi.sendSignal(activeCall.id, {
          type: 'ice-candidate',
          payload: event.candidate.toJSON(),
          target_user_id: userId,
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        pc.close()
        peerConnections.delete(userId)
        remoteStreams.delete(userId)
        set({ peerConnections: new Map(peerConnections), remoteStreams: new Map(remoteStreams) })
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
} as CallState & { createPeerConnection: (userId: number, createOffer: boolean, stream: MediaStream) => Promise<RTCPeerConnection | null> }))
