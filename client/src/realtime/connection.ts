import { authStorage } from '@/utils/authStorage'

type EventHandler = (data: unknown) => void

class RealtimeConnection {
  private eventSource: EventSource | null = null
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000

  connect() {
    // The token is session-scoped (see authStorage) so each browser tab
    // attaches to the correct user namespace when multiple logins coexist.
    const token = authStorage.getAccessToken()
    if (!token) return

    // Rebuild connection from scratch to avoid duplicated listeners.
    this.disconnect()
    this.eventSource = new EventSource(`/api/realtime/events/?token=${token}`)

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
      // Keep reconnect logic centralized so all callers get the same backoff behavior.
      this.scheduleReconnect()
    }

    this.eventSource.onopen = () => {
      this.reconnectDelay = 1000
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
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
      this.connect()
    }, this.reconnectDelay)
  }
}

export const realtime = new RealtimeConnection()
