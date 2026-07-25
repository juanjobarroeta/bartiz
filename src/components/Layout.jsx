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

const MORE_NAV = [
  { path: '/pagos-tesoreria',     label: 'Pagos (tesorería)' },
  { path: '/cuentas-proveedores', label: 'Cuentas de proveedores' },
  { path: '/proveedores-bartiz',  label: 'Proveedores' },
  { path: '/catalogo',            label: 'Catálogo' },
  { path: '/caja-chica',          label: 'Caja chica' },
  { path: '/destajo',             label: 'Destajo' },
  { path: '/reportes',            label: 'Reportes' },
]

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
const REDESIGNED_ROUTES = {
  '/': { title: 'Hoy', sub: 'Portafolio · cartera y caja' },
  '/proyectos': { title: 'Obras', sub: 'Cartera de obra' },
  '/tesoreria-bartiz': { title: 'Bancos y conciliación', sub: 'Estados de cuenta importados y su conciliación' },
  '/cuentas-por-pagar': { title: 'Cuentas por pagar', sub: 'Cola de admin · vencimientos y envío a tesorería' },
  '/pagos-tesoreria': { title: 'Pagos por realizar', sub: 'Feed de tesorería · lo que admin mandó a pagar' },
  '/cuentas-proveedores': { title: 'Cuentas de proveedores', sub: 'Cargos, abonos, saldos y anticipos' },
  '/compras-por-autorizar': { title: 'Compras por autorizar', sub: 'Compara proveedores y autoriza' },
  '/facturas': { title: 'Facturas (CFDI)', sub: 'Inbox y conciliación de comprobantes' },
}

// ── Tema (oscuro "Nocturno" / claro "Ledger") ────────────────────────────────
function useTheme() {
  // Default claro (look neutro tipo dashboard); Nocturno queda en el toggle.
  const [theme, setTheme] = useState(() => localStorage.getItem('bz-theme') || 'claro')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('bz-theme', theme)
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
  const moreRef = useRef(null)
  const userRef = useRef(null)

  // Cerrar menús al navegar o al hacer clic fuera.
  useEffect(() => { setMoreOpen(false); setUserOpen(false) }, [location.pathname])
  useEffect(() => {
    const fn = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
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
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }
  const moreActive = MORE_NAV.some((i) => isActive(i.path))

  const pageHead = REDESIGNED_ROUTES[location.pathname]
  const isWide = WIDE_ROUTES.some(
    (p) => location.pathname === p || location.pathname.startsWith(p)
  )
  const wordmark = activeCompany?.razonSocial?.split(/[,\s]+/).slice(0, 1).join(' ') || 'Bartiz'
  const initial = (user?.name || user?.email || 'B')[0]?.toUpperCase()

  return (
    <div className="bz-shell">
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
  )
}

export default Layout
