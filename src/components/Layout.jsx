/**
 * Layout / app shell — rediseño estilo Deel.
 *
 * Barra superior sticky: wordmark "b." + selector de empresa, pestañas de
 * ÁREA en pastilla (Inicio · Obras · Compras · Pagos · Comprobantes · Más),
 * buscador ⌘K y avatar con el menú de cuenta. Debajo, la sub-nav con las
 * páginas del área activa. Roles con ≤5 páginas ven pestañas planas.
 * <900px: wordmark + área actual + botón de menú que abre una hoja con los
 * links agrupados y la cuenta.
 *
 * La configuración de áreas/roles vive en ./shell/nav.js; los tokens del
 * tema en design-system.css (:root / :root[data-theme="claro"]).
 */

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { rutaPermitida, homePermitida } from '../auth/roles'
import { apiFetch } from '../config/api'
import { activarPush, desactivarPush, estadoPush } from '../lib/push'
import { navParaRol, areaActiva, itemActivo } from './shell/nav'
import CommandPalette from './shell/CommandPalette'
import './Layout.css'

// Contadores de la nav: compras por autorizar (badge accent) y CFDIs por
// vincular (muted). Best-effort — si el endpoint falla, el badge no aparece.
// `refreshKey` (la ruta actual) refresca los contadores en cada navegación:
// sin esto el badge se quedaba congelado con el conteo del primer load
// aunque la cola ya estuviera vacía.
function useSideCounts(companyId, refreshKey) {
  const [counts, setCounts] = useState({})
  useEffect(() => {
    if (!companyId) { setCounts({}); return }
    let alive = true
    const cid = encodeURIComponent(companyId)
    ;(async () => {
      const [compras, cfdis] = await Promise.all([
        apiFetch(`/api/construccion/solicitudes-compra?companyId=${cid}&estado=PENDIENTE`).catch(() => null),
        apiFetch(`/api/construccion/cfdis/resumen?companyId=${cid}`).catch(() => null),
      ])
      if (!alive) return
      setCounts({
        compras: Array.isArray(compras) ? compras.length : 0,
        facturas: cfdis && typeof cfdis.porVincular === 'number' ? cfdis.porVincular : 0,
      })
    })()
    return () => { alive = false }
  }, [companyId, refreshKey])
  return counts
}

// Rutas densas en datos (tablas anchas): usan el contenedor ancho del shell
// en lugar del editorial de 1120px, que las recortaba en desktop.
const WIDE_ROUTES = [
  '/tesoreria-bartiz',
  '/facturas',
  '/requisiciones',
  '/compras-por-autorizar',
  '/cuentas-por-pagar',
  '/pagos-tesoreria',
  '/cuentas-proveedores',
  '/proyectos/', // detalle de obra (tablas de costos/adjudicaciones)
  '/presupuesto', // cubre /presupuestos y /presupuesto/:id
  '/estimaciones',
  '/estimacion-viviendas',
  '/catalogo',
  '/destajo',
]

// Rutas rediseñadas que reciben el encabezado de página (h1) del shell;
// las páginas legacy siguen pintando su propio header.
// El Dashboard ('/') trae su propio encabezado (fecha + acción primaria,
// patrón del mockup), así que no aparece aquí.
const REDESIGNED_ROUTES = {
  '/proyectos': { title: 'Obras', sub: 'Cartera de obra' },
  '/tesoreria-bartiz': { title: 'Bancos y conciliación', sub: 'Estados de cuenta importados y su conciliación' },
  '/cuentas-por-pagar': { title: 'Cuentas por pagar', sub: 'Cola de admin · vencimientos y envío a tesorería' },
  '/pagos-tesoreria': { title: 'Pagos por realizar', sub: 'Feed de tesorería · lo que admin mandó a pagar' },
  '/cuentas-proveedores': { title: 'Cuentas de proveedores', sub: 'Cargos, abonos, saldos y anticipos' },
  '/compras-por-autorizar': { title: 'Compras por autorizar', sub: 'Compara proveedores y autoriza' },
  '/facturas': { title: 'Facturas (CFDI)', sub: 'Inbox y conciliación de comprobantes' },
}

// ── Tema (claro neutro default / oscuro "Nocturno" en el toggle) ─────────────
function useTheme() {
  // Migración de una sola vez al rediseño claro: la preferencia vieja
  // (bz-theme) se ignora para que TODOS aterricen en claro; la elección
  // hecha después del rediseño se persiste bajo bz-theme2.
  const [theme, setTheme] = useState(() => localStorage.getItem('bz-theme2') || 'claro')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('bz-theme2', theme)
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'oscuro' ? 'claro' : 'oscuro'))]
}

// ── Cambiar contraseña (self-serve, disponible para todos los roles) ─────────
/**
 * Item de menú "Notificaciones": activa/desactiva Web Push para este usuario
 * y empresa. Se esconde donde el navegador no soporta push (p. ej. Safari de
 * iOS sin instalar la app en pantalla de inicio); si el usuario las bloqueó,
 * lo dice — eso sólo se revierte en la configuración del navegador.
 */
function PushToggleItem({ companyId }) {
  const [estado, setEstado] = useState('cargando')
  useEffect(() => {
    let vivo = true
    estadoPush().then((e) => vivo && setEstado(e))
    return () => { vivo = false }
  }, [])

  if (estado === 'unsupported' || estado === 'cargando') return null
  if (estado === 'denied') {
    return (
      <div className="bz-menu-meta" title="Desbloquéalas en la configuración del navegador">
        Notificaciones bloqueadas
      </div>
    )
  }

  const toggle = async () => {
    const previo = estado
    setEstado('busy')
    try {
      setEstado(previo === 'on' ? await desactivarPush() : await activarPush(companyId))
    } catch (e) {
      alert(e.message || 'No se pudieron activar las notificaciones')
      setEstado(previo)
    }
  }

  return (
    <button type="button" className="bz-menu-item" onClick={toggle} disabled={estado === 'busy'}>
      {estado === 'on' ? 'Notificaciones: activadas ✓' : 'Activar notificaciones'}
    </button>
  )
}

function PasswordModal({ onClose }) {
  const [form, setForm] = useState({ actual: '', nueva: '', confirma: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (form.nueva.length < 8) { setError('La nueva contraseña necesita al menos 8 caracteres.'); return }
    if (form.nueva !== form.confirma) { setError('La confirmación no coincide.'); return }
    setBusy(true)
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: form.actual, newPassword: form.nueva },
      })
      setDone(true)
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content bz-pwd">
        <h3>Cambiar contraseña</h3>
        {done ? (
          <>
            <p className="bz-pwd-ok">✓ Contraseña actualizada.</p>
            <div className="bz-pwd-actions">
              <button type="button" className="bz-pwd-primary" onClick={onClose}>Listo</button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <label>
              Contraseña actual
              <input
                type="password"
                autoComplete="current-password"
                value={form.actual}
                onChange={(e) => setForm({ ...form, actual: e.target.value })}
                required
              />
            </label>
            <label>
              Nueva contraseña
              <input
                type="password"
                autoComplete="new-password"
                value={form.nueva}
                onChange={(e) => setForm({ ...form, nueva: e.target.value })}
                required
                minLength={8}
              />
            </label>
            <label>
              Confirmar nueva contraseña
              <input
                type="password"
                autoComplete="new-password"
                value={form.confirma}
                onChange={(e) => setForm({ ...form, confirma: e.target.value })}
                required
              />
            </label>
            {error && <p className="bz-pwd-error">{error}</p>}
            <div className="bz-pwd-actions">
              <button type="button" className="bz-pwd-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
              <button type="submit" className="bz-pwd-primary" disabled={busy}>
                {busy ? 'Guardando…' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

const CONTA_OS_URL = 'https://contabilidad-os-production.up.railway.app'

const Count = ({ n, hot }) =>
  n ? <span className={`bz-count${hot ? ' hot' : ''}`}>{n > 999 ? '999+' : n}</span> : null

/** Contenido del menú de cuenta (popover de avatar y hoja móvil). */
function AccountItems({ user, activeCompany, esAdmin, theme, toggleTheme, onPassword, logout }) {
  return (
    <>
      <div className="bz-menu-meta">{user?.email || user?.name}</div>
      <PushToggleItem companyId={activeCompany?.id} />
      <button type="button" className="bz-menu-item" onClick={onPassword}>
        Cambiar contraseña
      </button>
      <button type="button" className="bz-menu-item" onClick={toggleTheme}>
        {theme === 'oscuro' ? 'Tema claro' : 'Tema oscuro'}
      </button>
      {esAdmin && (
        <a className="bz-menu-item" href={CONTA_OS_URL} target="_blank" rel="noreferrer">
          contabilidad-os ↗
        </a>
      )}
      <div className="bz-menu-sep" />
      <button type="button" className="bz-menu-item danger" onClick={logout}>
        Cerrar sesión
      </button>
    </>
  )
}

const Layout = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, companies, activeCompany, activeCompanyId, selectCompany, logout, rol, paginas } = useAuth()
  const [theme, toggleTheme] = useTheme()
  const [userOpen, setUserOpen] = useState(false)
  const [companyOpen, setCompanyOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const userRef = useRef(null)
  const companyRef = useRef(null)
  const pathname = location.pathname

  // Contadores sólo para admin/contabilidad: los demás roles no tienen esos
  // endpoints en su allowlist.
  const esAdmin = !rol || rol === 'ADMIN'
  const counts = useSideCounts(esAdmin || rol === 'CONTABILIDAD' ? activeCompany?.id : null, pathname)

  // La matriz de páginas del miembro recorta la navegación de su rol.
  const visible = (item) => rutaPermitida(rol, item.path, paginas)
  const nav = navParaRol(rol, visible)
  const area = areaActiva(nav.areas, pathname)
  const areaCount = (a) =>
    a.items.reduce((sum, i) => sum + (i.badge ? counts[i.badge] || 0 : 0), 0)
  const areaHot = (a) => a.items.some((i) => i.badge === 'compras' && counts.compras)

  // Cerrar menús al navegar o al hacer clic fuera.
  useEffect(() => {
    setUserOpen(false); setCompanyOpen(false); setSheetOpen(false); setCmdOpen(false)
  }, [pathname])
  useEffect(() => {
    const fn = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
      if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])
  // ⌘K / Ctrl+K abre el buscador.
  useEffect(() => {
    const fn = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])
  // Hoja móvil abierta → sin scroll del fondo.
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sheetOpen])

  // Cambiar de empresa: si la página actual no existe para el rol de la
  // nueva empresa, aterriza en su home.
  const cambiarEmpresa = (c) => {
    setCompanyOpen(false)
    setSheetOpen(false)
    if (c.id === activeCompanyId) return
    selectCompany(c.id)
    const nRol = c.construccionRol ?? 'ADMIN'
    const nPag = c.construccionPaginas ?? []
    if (!rutaPermitida(nRol, pathname, nPag)) navigate(homePermitida(nRol, nPag))
  }

  const pageHead = REDESIGNED_ROUTES[pathname]
  const isWide = WIDE_ROUTES.some((p) => pathname === p || pathname.startsWith(p))
  const companyName = activeCompany?.razonSocial || 'Bartiz'
  const initial = (user?.name || user?.email || 'B')[0]?.toUpperCase()
  const multiEmpresa = (companies?.length ?? 0) > 1

  const cmdEntries = nav.flat
    ? nav.items.map((i) => ({ path: i.path, label: i.label }))
    : nav.areas.flatMap((a) =>
        a.items.map((i) => ({
          path: i.path,
          label: i.areaLabel || i.label,
          group: a.items.length > 1 ? a.label : null,
        }))
      )

  // Pestañas de primer nivel: áreas (o páginas en la vista plana).
  const topTabs = nav.flat
    ? nav.items.map((i) => ({
        key: i.path,
        to: i.path,
        label: i.label,
        active: itemActivo(i, pathname),
        count: i.badge ? counts[i.badge] : 0,
        hot: i.badge === 'compras',
      }))
    : nav.areas.map((a) => ({
        key: a.key,
        to: a.items[0].path,
        label: a.label,
        active: area?.key === a.key,
        count: areaCount(a),
        hot: areaHot(a),
      }))
  const subItems = !nav.flat && area && area.items.length > 1 ? area.items : null
  const currentLabel = nav.flat
    ? nav.items.find((i) => itemActivo(i, pathname))?.label
    : area?.label

  // Hoja móvil: las áreas de una sola página (Inicio, Obras) van juntas
  // arriba sin título; las demás, agrupadas con su nombre.
  const sheetGroups = nav.flat
    ? [{ key: 'flat', label: null, items: nav.items }]
    : [
        {
          key: 'top',
          label: null,
          items: nav.areas
            .filter((a) => a.items.length === 1)
            .map((a) => a.items[0]),
        },
        ...nav.areas.filter((a) => a.items.length > 1),
      ].filter((g) => g.items.length > 0)

  const companyPicker = (
    <div className="bz-company" ref={companyRef}>
      {multiEmpresa ? (
        <button
          type="button"
          className="bz-company-btn"
          onClick={() => setCompanyOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={companyOpen}
          title={companyName}
        >
          <span className="bz-company-name">{companyName}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <span className="bz-company-btn static" title={companyName}>
          <span className="bz-company-name">{companyName}</span>
        </span>
      )}
      {companyOpen && (
        <div className="bz-menu" role="menu">
          <div className="bz-menu-label">Empresa</div>
          {companies.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`bz-menu-item${c.id === activeCompanyId ? ' active' : ''}`}
              onClick={() => cambiarEmpresa(c)}
            >
              <span className="bz-menu-check">{c.id === activeCompanyId ? '✓' : ''}</span>
              {c.razonSocial}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const accountProps = {
    user, activeCompany, esAdmin, theme, toggleTheme, logout,
    onPassword: () => { setUserOpen(false); setSheetOpen(false); setPwdOpen(true) },
  }

  return (
    <div className="bz-shell">
      <header className="bz-top">
        <div className="bz-bar">
          <div className="bz-bar-left">
            <Link to="/" className="bz-mark" title="Inicio">b.</Link>
            <span className="bz-bar-sep" aria-hidden="true" />
            <div className="bz-desk">{companyPicker}</div>
            {currentLabel && <span className="bz-mob bz-mob-area">{currentLabel}</span>}
          </div>

          <nav className="bz-tabs bz-desk" aria-label="Áreas">
            {topTabs.map((t) => (
              <Link
                key={t.key}
                to={t.to}
                className={`bz-tab${t.active ? ' active' : ''}`}
                aria-current={t.active ? 'page' : undefined}
              >
                {t.label}
                <Count n={t.count} hot={t.hot} />
              </Link>
            ))}
          </nav>

          <div className="bz-bar-right">
            <button
              type="button"
              className="bz-search bz-desk"
              onClick={() => setCmdOpen(true)}
              title="Buscar página (⌘K)"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="bz-search-txt">Buscar</span>
              <kbd>⌘K</kbd>
            </button>
            <div className="bz-user bz-desk" ref={userRef}>
              <button
                type="button"
                className="bz-avatar"
                onClick={() => setUserOpen((o) => !o)}
                title={user?.email || user?.name}
                aria-haspopup="menu"
                aria-expanded={userOpen}
              >
                {initial}
              </button>
              {userOpen && (
                <div className="bz-menu bz-menu-right" role="menu">
                  <AccountItems {...accountProps} />
                </div>
              )}
            </div>
            <button
              type="button"
              className="bz-menubtn bz-mob"
              onClick={() => setSheetOpen(true)}
              aria-label="Abrir menú"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {subItems && (
          <nav className="bz-subnav bz-desk" aria-label={area.label}>
            {subItems.map((i) => {
              const on = itemActivo(i, pathname)
              return (
                <Link
                  key={i.path}
                  to={i.path}
                  className={`bz-subtab${on ? ' active' : ''}`}
                  aria-current={on ? 'page' : undefined}
                >
                  {i.areaLabel || i.label}
                  <Count n={i.badge ? counts[i.badge] : 0} hot={i.badge === 'compras'} />
                </Link>
              )
            })}
          </nav>
        )}
      </header>

      {sheetOpen && (
        <div className="bz-sheet" role="dialog" aria-label="Menú">
          <div className="bz-sheet-head">
            <span className="bz-mark">b.</span>
            <button type="button" className="bz-menubtn" onClick={() => setSheetOpen(false)} aria-label="Cerrar menú">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="bz-sheet-body">
            {multiEmpresa ? (
              <div className="bz-sheet-group">
                <div className="bz-menu-label">Empresa</div>
                {companies.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={`bz-sheet-link${c.id === activeCompanyId ? ' active' : ''}`}
                    onClick={() => cambiarEmpresa(c)}
                  >
                    {c.razonSocial}
                    {c.id === activeCompanyId && <span>✓</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bz-sheet-company">{companyName}</div>
            )}
            {sheetGroups.map((g) => (
              <div className="bz-sheet-group" key={g.key}>
                {g.label && <div className="bz-menu-label">{g.label}</div>}
                {g.items.map((i) => (
                  <Link
                    key={i.path}
                    to={i.path}
                    className={`bz-sheet-link${itemActivo(i, pathname) ? ' active' : ''}`}
                    onClick={() => setSheetOpen(false)}
                  >
                    {i.areaLabel || i.label}
                    <Count n={i.badge ? counts[i.badge] : 0} hot={i.badge === 'compras'} />
                  </Link>
                ))}
              </div>
            ))}
            <div className="bz-sheet-group bz-sheet-account">
              <div className="bz-menu-label">Cuenta</div>
              <AccountItems {...accountProps} />
            </div>
          </div>
        </div>
      )}

      <div className={`ds bz-content${isWide ? ' bz-content--wide' : ''}`}>
        {pageHead && (
          <div className="bz-pagehead">
            <h1>{pageHead.title}</h1>
            {pageHead.sub && <span className="bz-pagehead-sub">{pageHead.sub}</span>}
          </div>
        )}
        {children}
      </div>

      {cmdOpen && <CommandPalette entries={cmdEntries} onClose={() => setCmdOpen(false)} />}
      {pwdOpen && <PasswordModal onClose={() => setPwdOpen(false)} />}
    </div>
  )
}

export default Layout
