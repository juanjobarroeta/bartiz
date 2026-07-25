/**
 * Layout / app shell — rediseño Bartiz ("Nocturno" / "Ledger").
 *
 * Barra de navegación HORIZONTAL sticky (sustituye al sidebar): wordmark
 * serif itálica, nav de 8 items primarios + menú "más" con los módulos
 * secundarios, fecha, toggle de tema (oscuro⇄claro, persistido en
 * localStorage como bz-theme) y avatar con menú de cuenta.
 *
 * Los tokens del tema viven en design-system.css sobre :root /
 * :root[data-theme="claro"]; aquí sólo se conmuta el atributo.
 */

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import './Layout.css'

// Nav primario (orden y nombres cortos del diseño). El resto de módulos
// viven en el menú "más".
const PRIMARY_NAV = [
  { path: '/',                      label: 'Hoy' },
  { path: '/proyectos',             label: 'Obras' },
  { path: '/requisiciones',         label: 'Reqs' },
  { path: '/compras-por-autorizar', label: 'Compras' },
  { path: '/facturas',              label: 'Facturas' },
  { path: '/cuentas-por-pagar',     label: 'Pagos' },
  { path: '/tesoreria-bartiz',      label: 'Bancos' },
  { path: '/gastos',                label: 'Gastos' },
]

// Nav secundaria móvil (dropdown "más"). Nota: /pagos-tesoreria ya no tiene
// entrada propia — es la misma cola de Pagos pre-filtrada (la URL sigue viva
// como bookmark de la tesorera). "Estados de cuenta" = saldos/anticipos de
// proveedores (antes "Cuentas de proveedores", fácil de confundir con el
// directorio de Proveedores).
const MORE_NAV = [
  { path: '/proveedores-bartiz',  label: 'Proveedores' },
  { path: '/cuentas-proveedores', label: 'Estados de cuenta' },
  { path: '/catalogo',            label: 'Catálogo' },
  { path: '/caja-chica',          label: 'Caja chica' },
  { path: '/destajo',             label: 'Destajo' },
  { path: '/reportes',            label: 'Reportes' },
]

// Sidebar de desktop, agrupado por dominio (patrón del mockup): etiquetas
// completas + contadores. `badge` es una llave del objeto de counts.
const SIDE_SECTIONS = [
  {
    title: null,
    items: [{ path: '/', label: 'Panel' }],
  },
  {
    title: 'Obra',
    items: [
      { path: '/proyectos',             label: 'Obras' },
      { path: '/requisiciones',         label: 'Requisiciones' },
      { path: '/compras-por-autorizar', label: 'Compras', badge: 'compras' },
      { path: '/destajo',               label: 'Destajo' },
    ],
  },
  {
    title: 'Dinero',
    items: [
      { path: '/cuentas-por-pagar', label: 'Pagos' },
      { path: '/tesoreria-bartiz',  label: 'Bancos' },
      { path: '/facturas',          label: 'Facturas', badge: 'facturas' },
      { path: '/gastos',            label: 'Gastos' },
      { path: '/caja-chica',        label: 'Caja chica' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { path: '/proveedores-bartiz',  label: 'Proveedores' },
      { path: '/cuentas-proveedores', label: 'Estados de cuenta' },
      { path: '/catalogo',            label: 'Catálogo' },
      { path: '/reportes',            label: 'Reportes' },
    ],
  },
]

// Contadores del sidebar: compras por autorizar (badge accent) y CFDIs por
// vincular (muted). Best-effort — si el endpoint falla, el badge no aparece.
function useSideCounts(companyId) {
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
  }, [companyId])
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

// Rutas rediseñadas que reciben el encabezado de página (h1 serif) del shell;
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

const fmtHoy = () =>
  new Date().toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })

const Layout = ({ children }) => {
  const location = useLocation()
  const { user, activeCompany, logout } = useAuth()
  const [theme, toggleTheme] = useTheme()
  const [moreOpen, setMoreOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [sideUserOpen, setSideUserOpen] = useState(false)
  const moreRef = useRef(null)
  const userRef = useRef(null)
  const sideUserRef = useRef(null)
  const sideCounts = useSideCounts(activeCompany?.id)

  // Cerrar menús al navegar o al hacer clic fuera.
  useEffect(() => { setMoreOpen(false); setUserOpen(false); setSideUserOpen(false) }, [location.pathname])
  useEffect(() => {
    const fn = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
      if (sideUserRef.current && !sideUserRef.current.contains(e.target)) setSideUserOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Nota: el antiguo shell PWA móvil (src/mobile) quedó retirado — montaba una
  // UI distinta en /, /proyectos y /tesoreria-bartiz en teléfonos y se veían
  // dos apps mezcladas. El Layout responsivo es ahora la única UI.

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    if (path === '/proyectos') return location.pathname.startsWith('/proyectos')
    if (path === '/requisiciones') return location.pathname.startsWith('/requisiciones')
    // Aliases: /pagos-tesoreria es la cola de Pagos pre-filtrada; /reembolsos
    // es la ruta vieja de Caja chica (el botón "volver" del detalle aún la usa).
    if (path === '/cuentas-por-pagar' && location.pathname.startsWith('/pagos-tesoreria')) return true
    if (path === '/caja-chica' && location.pathname.startsWith('/reembolsos')) return true
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }
  const moreActive = MORE_NAV.some((i) => isActive(i.path))

  const pageHead = REDESIGNED_ROUTES[location.pathname]
  const isWide = WIDE_ROUTES.some(
    (p) => location.pathname === p || location.pathname.startsWith(p)
  )
  const wordmark = activeCompany?.razonSocial?.split(/[,\s]+/).slice(0, 1).join(' ') || 'Bartiz'
  const initial = (user?.name || user?.email || 'B')[0]?.toUpperCase()

  const sideBadge = (item) => {
    const n = item.badge ? sideCounts[item.badge] : null
    if (!n) return null
    return (
      <span className={`bz-side-count${item.badge === 'compras' ? ' hot' : ''}`}>
        {n > 999 ? '999+' : n}
      </span>
    )
  }

  return (
    <div className="bz-shell">
      {/* Sidebar de desktop (≥1025px) — patrón del mockup. En móvil se oculta
          y la top nav de abajo sigue siendo la navegación. */}
      <aside className="bz-sidebar">
        <Link to="/" className="bz-side-brand" title={activeCompany?.razonSocial}>
          <span className="bz-side-mark">{wordmark[0]?.toUpperCase()}</span>
          <span className="bz-side-name">{wordmark}</span>
        </Link>
        <nav className="bz-side-nav">
          {SIDE_SECTIONS.map((sec, si) => (
            <div className="bz-side-group" key={sec.title ?? si}>
              {sec.title && <div className="bz-side-title">{sec.title}</div>}
              {sec.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`bz-side-item${isActive(item.path) ? ' active' : ''}`}
                >
                  <span>{item.label}</span>
                  {sideBadge(item)}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="bz-side-foot">
          <button
            type="button"
            className="bz-theme-toggle"
            onClick={toggleTheme}
            title="Cambiar tema"
          >
            <span className="bz-theme-dot" />
            {theme === 'oscuro' ? 'NOCTURNO' : 'CLARO'}
          </button>
          <div className="bz-side-user" ref={sideUserRef}>
            <button
              type="button"
              className="bz-side-userbtn"
              onClick={() => setSideUserOpen((o) => !o)}
              title={user?.email}
            >
              <span className="bz-avatar sm">{initial}</span>
              <span className="bz-side-username">{(user?.name || user?.email || '').split('@')[0]}</span>
            </button>
            {sideUserOpen && (
              <div className="bz-menu bz-menu-up">
                <div className="bz-menu-meta">{user?.email}</div>
                <div className="bz-menu-meta">{activeCompany?.razonSocial}</div>
                <a
                  className="bz-menu-item"
                  href="https://contabilidad-os-production.up.railway.app"
                  target="_blank"
                  rel="noreferrer"
                >
                  contabilidad-os ↗
                </a>
                <button type="button" className="bz-menu-item danger" onClick={logout}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="bz-main">
      <header className="bz-topnav">
        <Link to="/" className="bz-wordmark" title={activeCompany?.razonSocial}>
          {wordmark}
        </Link>

        <nav className="bz-nav">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`bz-nav-item${isActive(item.path) ? ' active' : ''}`}
            >
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="bz-more" ref={moreRef}>
            <button
              type="button"
              className={`bz-nav-item${moreActive ? ' active' : ''}`}
              onClick={() => setMoreOpen((o) => !o)}
            >
              <span>más ▾</span>
            </button>
            {moreOpen && (
              <div className="bz-menu">
                {MORE_NAV.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`bz-menu-item${isActive(item.path) ? ' active' : ''}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="bz-topnav-right">
          <span className="bz-date">{fmtHoy()}</span>
          <button
            type="button"
            className="bz-theme-toggle"
            onClick={toggleTheme}
            title="Cambiar tema"
          >
            <span className="bz-theme-dot" />
            {theme === 'oscuro' ? 'NOCTURNO' : 'LEDGER'}
          </button>
          <div className="bz-user" ref={userRef}>
            <button
              type="button"
              className="bz-avatar"
              onClick={() => setUserOpen((o) => !o)}
              title={user?.email}
            >
              {initial}
            </button>
            {userOpen && (
              <div className="bz-menu bz-menu-right">
                <div className="bz-menu-meta">{user?.email}</div>
                <div className="bz-menu-meta">{activeCompany?.razonSocial}</div>
                <a
                  className="bz-menu-item"
                  href="https://contabilidad-os-production.up.railway.app"
                  target="_blank"
                  rel="noreferrer"
                >
                  contabilidad-os ↗
                </a>
                <button type="button" className="bz-menu-item danger" onClick={logout}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={`ds bz-content${isWide ? ' bz-content--wide' : ''}`}>
        {pageHead && (
          <div className="bz-pagehead">
            <h1>{pageHead.title}</h1>
            {pageHead.sub && <span className="bz-pagehead-sub">{pageHead.sub}</span>}
          </div>
        )}
        {children}
      </div>
      </div>
    </div>
  )
}

export default Layout
