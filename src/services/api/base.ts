export const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD
    ? 'https://accounting-backendd.onrender.com/api'
    : 'http://localhost:8000/api'
)

const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 30_000

export function clearCache() {
  cache.clear()
}

let _refreshPromise: Promise<boolean> | null = null

// Called when the refresh token is explicitly rejected (401).
// Redirects to / so the landing page shows — not /login directly.
function forceLogout() {
  if (window.location.pathname !== '/') {
    window.location.href = '/'
  }
}

async function tryRefreshToken(): Promise<boolean> {
  if (!_refreshPromise) {
    _refreshPromise = fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(res => {
        // Only force-logout on explicit 401 (token truly expired/invalid).
        // Any other non-ok status (503 during backend spinup, etc.) is a
        // transient error — let the caller handle it gracefully.
        if (res.status === 401) forceLogout()
        return res.ok
      })
      .catch(() => false)  // Network/timeout error — don't logout, caller handles it
      .finally(() => { _refreshPromise = null })
  }
  return _refreshPromise
}

export async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`
  const method = (options.method ?? 'GET').toUpperCase()

  if (method === 'GET') {
    const cached = cache.get(url)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.data
    }
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  }

  let response = await fetch(url, mergedOptions)

  if (response.status === 401) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      response = await fetch(url, mergedOptions)
    }
  }

  if (!response.ok) {
    let errorMessage = 'An error occurred.'
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.detail || errorMessage
    } catch {
      // response was not JSON
    }
    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    if (method !== 'GET') cache.clear()
    return null
  }

  const data = await response.json()

  if (method === 'GET') {
    cache.set(url, { data, ts: Date.now() })
  } else {
    cache.clear()
  }

  return data
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const mergedOptions: RequestInit = { ...options, credentials: 'include' }
  let response = await fetch(url, mergedOptions)
  if (response.status === 401) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      response = await fetch(url, mergedOptions)
    }
  }
  return response
}
