import { authStorage } from '@/utils/authStorage'

type EventHandler = (data: unknown) => void
export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting'

class RealtimeConnection {
  private eventSource: EventSource | null = null
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private state: ConnectionState = 'disconnected'
  private stateListeners: Set<(state: ConnectionState) => void> = new Set()

  onStateChange(listener: (state: ConnectionState) => void) {
    this.stateListeners.add(listener)
    listener(this.state)
    return () => {
      this.stateListeners.delete(listener)
    }
  }

  getState() {
    return this.state
  }

  private setState(state: ConnectionState) {
    this.state = state
    this.stateListeners.forEach((listener) => listener(state))
  }

  connect() {
    // The token is session-scoped (see authStorage) so each browser tab
    // attaches to the correct user namespace when multiple logins coexist.
    const token = authStorage.getAccessToken()
    if (!token) {
      this.setState('disconnected')
      return
    }

    // Rebuild connection from scratch to avoid duplicated listeners.
    this.disconnect()
    this.setState('reconnecting')
    this.eventSource = new EventSource(`/api/realtime/events/?token=${encodeURIComponent(token)}`)

    this.eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        const type = parsed.type as string
        const handlers = this.handlers.get(type)
        if (handlers) {
          handlers.forEach((handler) => handler(parsed.data))
        }
        // Wildcard listeners receive the full envelope for diagnostics.
        const wildcardHandlers = this.handlers.get('*')
        if (wildcardHandlers) {
          wildcardHandlers.forEach((handler) => handler(parsed))
        }
      } catch {
        // Ignore parse errors (heartbeats, etc.)
      }
    }

    this.eventSource.onerror = () => {
      this.eventSource?.close()
      this.eventSource = null
      this.setState('disconnected')
      // Keep reconnect logic centralized so all callers get the same backoff behavior.
      this.scheduleReconnect()
    }

    this.eventSource.onopen = () => {
      this.reconnectDelay = 1000
      this.setState('connected')
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.setState('disconnected')
  }

  on(eventType: string, handler: EventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)
    return () => this.off(eventType, handler)
  }

  off(eventType: string, handler: EventHandler) {
    this.handlers.get(eventType)?.delete(handler)
  }

  private scheduleReconnect() {
    // Exponential backoff with cap to protect both browser and backend during outages.
    this.setState('reconnecting')
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
      this.connect()
    }, this.reconnectDelay)
  }
}

export const realtime = new RealtimeConnection()
