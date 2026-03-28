import { authStorage } from '@/utils/authStorage'

const API_BASE = '/api'

interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

// Helper to extract results from paginated or direct responses
export function extractResults<T>(data: T | { results: T; count?: number }): T {
  if (data && typeof data === 'object' && 'results' in data) {
    return (data as { results: T }).results
  }
  return data
}

async function refreshToken(): Promise<string | null> {
  // Refresh uses the same session namespace as active access token.
  const refresh = authStorage.getRefreshToken()
  if (!refresh) return null
  try {
    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return null
    const data = await res.json()
    authStorage.setAccessToken(data.access)
    if (data.refresh) authStorage.setRefreshToken(data.refresh)
    return data.access
  } catch {
    return null
  }
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options
  let token = authStorage.getAccessToken()

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body)
  }

  let res = await fetch(`${API_BASE}${path}`, config)

  // Auto-refresh on 401 keeps UX smooth across access token expiry.
  if (res.status === 401 && token) {
    const newToken = await refreshToken()
    if (newToken) {
      (config.headers as Record<string, string>).Authorization = `Bearer ${newToken}`
      res = await fetch(`${API_BASE}${path}`, config)
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw error
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
  let token = authStorage.getAccessToken()

  const config: RequestInit = {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }

  const res = await fetch(`${API_BASE}${path}`, config)

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw error
  }

  return res.json()
}
