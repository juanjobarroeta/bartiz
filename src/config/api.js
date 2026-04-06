/**
 * API client for construccion-admin → contabilidad-os.
 *
 * Reads the contabilidad-os base URL from VITE_API_URL (required in prod,
 * falls back to localhost:3000 for local dev against `npm run dev`).
 *
 * Every request auto-attaches the bearer token stored by AuthContext.
 * On 401 we clear the token and reload to /login so stale sessions don't
 * silently fail forever.
 */

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  'http://localhost:3000'

const TOKEN_KEY = 'cadmin.token'

// ── Token storage ────────────────────────────────────────────────────────
export const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* ignore */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  },
}

// Back-compat with the old helper signature: build a full URL string.
// Prefer using `apiFetch` which handles auth + JSON in one call.
export const api = (endpoint) => {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${API_URL}${clean}`
}

/**
 * Core fetch wrapper. Returns parsed JSON on 2xx, throws an Error with
 * a .status property on non-2xx. On 401 it also clears the token and
 * redirects to /login so the user can re-auth.
 *
 * Usage:
 *   const proyectos = await apiFetch('/api/construccion/proyectos?companyId=...')
 *   const created   = await apiFetch('/api/construccion/proyectos', {
 *     method: 'POST',
 *     body: { companyId, codigo, nombre, tipo: 'PRIVADO' },
 *   })
 */
export async function apiFetch(path, opts = {}) {
  const { method = 'GET', body, headers = {}, skipAuth = false } = opts

  const finalHeaders = {
    Accept: 'application/json',
    ...headers,
  }
  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json'
  }
  if (!skipAuth) {
    const token = tokenStorage.get()
    if (token) finalHeaders.Authorization = `Bearer ${token}`
  }

  const res = await fetch(api(path), {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !skipAuth) {
      tokenStorage.clear()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    const err = new Error(
      (data && typeof data === 'object' && data.error) ||
        `Request failed: ${res.status}`
    )
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

export default API_URL
