type EventHandler = (data: unknown) => void

class RealtimeConnection {
  private eventSource: EventSource | null = null
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000

  connect() {
    const token = localStorage.getItem('access_token')
    if (!token) return

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
        // Also emit to wildcard listeners
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
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
      this.connect()
    }, this.reconnectDelay)
  }
}

export const realtime = new RealtimeConnection()
