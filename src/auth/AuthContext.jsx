/**
 * Auth state + active-empresa selection for construccion-admin.
 *
 * Holds:
 *   - user          : { id, email, name } | null
 *   - companies     : [{ id, rfc, razonSocial, role, modulos: [] }]
 *   - activeCompany : the currently selected empresa (scopes every API call)
 *   - token         : the bearer JWT (also persisted in localStorage)
 *
 * Persistence:
 *   Token + activeCompanyId survive a reload via localStorage. On boot we
 *   verify the token by calling a light endpoint (/api/construccion/proyectos
 *   with whatever empresa is active) — if it 401s, apiFetch auto-redirects
 *   to /login and the context is empty on next mount.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { apiFetch, tokenStorage } from '../config/api'

const ACTIVE_COMPANY_KEY = 'cadmin.activeCompanyId'
const USER_KEY = 'cadmin.user'
const COMPANIES_KEY = 'cadmin.companies'

const AuthContext = createContext(null)

function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJson(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/**
 * Bartiz is the construcción product. Companies in a user's despacho that
 * DON'T have CONSTRUCCION enabled (e.g. Juan's Baobab Holdings, Zionx,
 * personal RFCs) make no sense here — every page calls /api/construccion/*
 * which returns 403 for those companies. Filter early so the switcher
 * never shows them.
 */
function filterConstrucción(list) {
  return (Array.isArray(list) ? list : []).filter((c) =>
    c.modulos?.includes('CONSTRUCCION')
  )
}

export function AuthProvider({ children }) {
  // Rehydrate from localStorage on first mount so a reload keeps the session.
  const [user, setUser] = useState(() => readJson(USER_KEY))
  const [companies, setCompanies] = useState(() => filterConstrucción(readJson(COMPANIES_KEY)))
  const [activeCompanyId, setActiveCompanyId] = useState(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_COMPANY_KEY)
      // If stored active points to a non-construction company (stale from a
      // previous login or a company that had its module disabled), drop it —
      // the boot effect below will pick a valid one.
      const cached = filterConstrucción(readJson(COMPANIES_KEY))
      if (stored && cached.some((c) => c.id === stored)) return stored
      return cached[0]?.id ?? null
    } catch {
      return null
    }
  })
  const [booting, setBooting] = useState(true)

  // If we have a token but no user/companies cached, consider ourselves
  // unauthenticated — forcing the user to re-login is safer than holding
  // a token with unknown scope.
  useEffect(() => {
    const token = tokenStorage.get()
    if (!token) {
      setBooting(false)
      return
    }
    if (!user || !companies.length) {
      tokenStorage.clear()
      setBooting(false)
      return
    }
    setBooting(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async ({ email, password }) => {
    const data = await apiFetch('/api/auth/token', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    })

    const construccionCompanies = filterConstrucción(data.companies)

    tokenStorage.set(data.token)
    writeJson(USER_KEY, data.user)
    writeJson(COMPANIES_KEY, construccionCompanies)
    setUser(data.user)
    setCompanies(construccionCompanies)

    // Default active = first construcción-enabled company. If the user has
    // none (shouldn't happen — backend should reject), clear active.
    const pick = construccionCompanies[0]
    if (pick) {
      localStorage.setItem(ACTIVE_COMPANY_KEY, pick.id)
      setActiveCompanyId(pick.id)
    } else {
      localStorage.removeItem(ACTIVE_COMPANY_KEY)
      setActiveCompanyId(null)
    }

    return data
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    localStorage.removeItem(ACTIVE_COMPANY_KEY)
    writeJson(USER_KEY, null)
    writeJson(COMPANIES_KEY, null)
    setUser(null)
    setCompanies([])
    setActiveCompanyId(null)
  }, [])

  const selectCompany = useCallback((companyId) => {
    localStorage.setItem(ACTIVE_COMPANY_KEY, companyId)
    setActiveCompanyId(companyId)
  }, [])

  const activeCompany = useMemo(
    () => companies.find((c) => c.id === activeCompanyId) ?? null,
    [companies, activeCompanyId]
  )

  const value = useMemo(
    () => ({
      user,
      companies,
      activeCompany,
      activeCompanyId,
      isAuthenticated: !!user,
      booting,
      login,
      logout,
      selectCompany,
    }),
    [user, companies, activeCompany, activeCompanyId, booting, login, logout, selectCompany]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
