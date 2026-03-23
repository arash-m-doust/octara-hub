import { api } from './client'

export interface CallParticipant {
  id: number
  user: {
    id: number
    username: string
    profile?: { display_name?: string; avatar_path?: string }
  }
  joined_at: string
  left_at: string | null
  is_muted: boolean
  is_video_off: boolean
}

export interface CallSession {
  id: number
  channel: number | null
  dm_thread: number | null
  initiator: {
    id: number
    username: string
    profile?: { display_name?: string; avatar_path?: string }
  }
  call_type: 'voice' | 'video'
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'declined'
  started_at: string
  ended_at: string | null
  participants: CallParticipant[]
}

export function startCall(data: {
  channel_id?: number
  dm_thread_id?: number
  call_type: 'voice' | 'video'
}) {
  return api<CallSession>('/calls/start/', { method: 'POST', body: data })
}

export function joinCall(callId: number) {
  return api<CallSession>(`/calls/${callId}/join/`, { method: 'POST' })
}

export function leaveCall(callId: number) {
  return api(`/calls/${callId}/leave/`, { method: 'POST' })
}

export function endCall(callId: number) {
  return api(`/calls/${callId}/end/`, { method: 'POST' })
}

export function declineCall(callId: number) {
  return api(`/calls/${callId}/decline/`, { method: 'POST' })
}

export function sendSignal(callId: number, data: {
  type: 'offer' | 'answer' | 'ice-candidate'
  payload: unknown
  target_user_id?: number
}) {
  return api(`/calls/${callId}/signal/`, { method: 'POST', body: data })
}

export function toggleMedia(callId: number, data: {
  is_muted?: boolean
  is_video_off?: boolean
}) {
  return api(`/calls/${callId}/media/`, { method: 'POST', body: data })
}

export function getActiveCall(params: { channel_id?: number; dm_thread_id?: number }) {
  const query = params.channel_id
    ? `channel_id=${params.channel_id}`
    : `dm_thread_id=${params.dm_thread_id}`
  return api<CallSession | null>(`/calls/active/?${query}`)
}
