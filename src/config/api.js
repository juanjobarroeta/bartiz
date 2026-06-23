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

// All localStorage keys that make up a session. Kept here (the lowest-level
// auth module) so the 401 handler can wipe the ENTIRE session, not just the
// token. AuthContext owns the user/companies/activeCompany keys but mirrors
// these exact names. If only the token is cleared, the cached user survives,
// `isAuthenticated` stays true, and the /login → / redirect bounces back into
// an authenticated route that immediately 401s again — an infinite reload loop.
const SESSION_KEYS = [
  TOKEN_KEY,
  'cadmin.user',
  'cadmin.companies',
  'cadmin.activeCompanyId',
]

/** Wipe every session key from localStorage. Used on logout and on any 401. */
export function clearSession() {
  for (const k of SESSION_KEYS) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}

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
  // FormData (binary uploads) is sent as-is so the browser can set the
  // multipart boundary in Content-Type. JSON-shaped bodies still go through
  // JSON.stringify with the default content-type.
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isFormData) {
    finalHeaders['Content-Type'] = 'application/json'
  }
  if (!skipAuth) {
    const token = tokenStorage.get()
    if (token) finalHeaders.Authorization = `Bearer ${token}`
  }

  const res = await fetch(api(path), {
    method,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : isFormData
        ? body
        : JSON.stringify(body),
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
      // Clear the WHOLE session (not just the token). Leaving the cached
      // user/companies behind keeps `isAuthenticated` true, so /login bounces
      // back to an authenticated route that 401s again → infinite reload loop.
      clearSession()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    // Log to console with URL + body so failures are debuggable from
    // devtools when the user hits something unexpected. The displayed
    // alert message can stay short.
    if (typeof console !== 'undefined') {
      console.error(`[apiFetch] ${method} ${path} → ${res.status}`, {
        body: typeof data === 'string' ? data.slice(0, 500) : data,
      })
    }
    const friendlyMsg =
      data && typeof data === 'object' && data.error
        ? data.error
        : `${method} ${path} → ${res.status}${
            res.status === 404 ? ' (ruta no encontrada o no desplegada aún)' : ''
          }`
    const err = new Error(friendlyMsg)
    err.status = res.status
    err.data = data
    err.url = path
    throw err
  }

  return data
}

export default API_URL
