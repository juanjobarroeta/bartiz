/**
 * Layout / app shell — DECOLSA "Plataforma de Obra" redesign.
 *
 * A fixed two-column shell: a 244px sticky sidebar (company identity +
 * primary nav + account) and a fluid main column. Routes that have been
 * ported to the new design system also get a sticky translucent topbar
 * (page title + global search + notifications + avatar); legacy pages keep
 * rendering their own headers until they're migrated, so the topbar is only
 * shown for routes listed in REDESIGNED_ROUTES.
 *
 * Nav only shows pages that have been ported to the contabilidad-os backend
 * (`ported: true`). Duplicates of contabilidad-os native UI stay hidden —
 * users manage those in contabilidad-os.
 */

import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon, BrandGlyph } from './ds/Icon'
import { useIsMobile } from '../lib/useIsMobile'
import MobileApp from '../mobile/MobileApp'
import './Layout.css'

// Brand mark glyph (six are available in the design system; `tower` is the
// chosen production mark — stacked towers for a housing/"Torres" developer).
const BRAND_LOGO = 'tower'

// Nav structure. `icon` is a key into the design-system line-icon set.
const ALL_NAV_ITEMS = [
  { path: '/',                    label: 'Dashboard',     icon: 'dashboard',     ported: true },
  { path: '/proyectos',           label: 'Proyectos',     icon: 'projects',      ported: true },
  { path: '/catalogo',            label: 'Catálogo',      icon: 'catalog',       ported: true },
  { path: '/requisiciones',       label: 'Requisiciones', icon: 'requisiciones', ported: true },
  { path: '/compras-por-autorizar', label: 'Compras por autorizar', icon: 'requisiciones', ported: true },
  { path: '/proveedores-bartiz',  label: 'Proveedores',   icon: 'proveedores',   ported: true },
  { path: '/gastos',              label: 'Gastos',        icon: 'gastos',        ported: true },
  { path: '/caja-chica',          label: 'Caja Chica',    icon: 'cajachica',     ported: true },
  { path: '/destajo',             label: 'Destajo',       icon: 'destajo',       ported: true },
  { path: '/tesoreria-bartiz',    label: 'Bancos y conciliación', icon: 'tesoreria', ported: true },
  { path: '/cuentas-por-pagar',   label: 'Cuentas por pagar', icon: 'receipt',   ported: true },
  { path: '/pagos-tesoreria',     label: 'Pagos (tesorería)', icon: 'tesoreria', ported: true },
  { path: '/cuentas-proveedores', label: 'Cuentas de proveedores', icon: 'proveedores', ported: true },
  { path: '/facturas',            label: 'Facturas (CFDI)', icon: 'file',        ported: true },
  { path: '/reportes',            label: 'Reportes',      icon: 'reportes',      ported: true },

  // Permanently hidden — contabilidad-os native UI owns these.
  { path: '/clientes',            label: 'Clientes',      icon: 'proveedores',   ported: false, hidden: true },
  { path: '/empleados',           label: 'Empleados',     icon: 'destajo',       ported: false, hidden: true },
  { path: '/proveedores',         label: 'Proveedores',   icon: 'proveedores',   ported: false, hidden: true },
  { path: '/tesoreria',           label: 'Tesorería (legacy)', icon: 'tesoreria', ported: false, hidden: true },
  { path: '/contabilidad',        label: 'Contabilidad',  icon: 'reportes',      ported: false, hidden: true },
  { path: '/usuarios',            label: 'Usuarios',      icon: 'proveedores',   ported: false, hidden: true },

  // Deprecated — kept hidden until referrers are gone.
  { path: '/reembolsos',          label: 'Reembolsos',    icon: 'cajachica',     ported: false, hidden: true },
  { path: '/solicitudes-compra',  label: 'Solicitudes',   icon: 'requisiciones', ported: false, hidden: true },
]

// Entry routes owned by the mobile PWA shell. On phones these mount the
// dedicated mobile experience; every other route keeps the desktop layout
// (with the off-canvas drawer) so the secondary modules stay reachable on
// mobile too. The PWA handles its internal nav (tabs + project detail) in
// component state, so only these entry paths need to be listed.
const MOBILE_PWA_ROUTES = new Set(['/', '/proyectos', '/tesoreria-bartiz'])

// Routes whose pages have been rebuilt on the design system and therefore
// render the shared topbar (instead of their own page header).
const REDESIGNED_ROUTES = {
  '/': { title: 'Dashboard', sub: 'Portafolio · cartera y caja' },
  '/proyectos': { title: 'Proyectos', sub: 'Cartera de obra · contabilidad-os' },
  '/tesoreria-bartiz': { title: 'Bancos y conciliación', sub: 'Estados de cuenta importados y su conciliación' },
  '/cuentas-por-pagar': { title: 'Cuentas por pagar', sub: 'Cola de admin · vencimientos y envío a tesorería' },
  '/pagos-tesoreria': { title: 'Pagos por realizar', sub: 'Feed de tesorería · lo que admin mandó a pagar' },
  '/cuentas-proveedores': { title: 'Cuentas de proveedores', sub: 'Estado de cuenta · cargos, abonos, saldos y anticipos' },
  '/compras-por-autorizar': { title: 'Compras por autorizar', sub: 'Compara proveedores y autoriza' },
  '/facturas': { title: 'Facturas (CFDI)', sub: 'Inbox y conciliación de comprobantes' },
}

const Layout = ({ children }) => {
  const location = useLocation()
  const { user, activeCompany, logout } = useAuth()
  const isMobile = useIsMobile()

  // On mobile the sidebar is an off-canvas drawer toggled by the hamburger.
  // Close it on any navigation so tapping a nav item dismisses the drawer.
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Phone viewports get the dedicated mobile PWA shell (bottom tab nav +
  // approval flows) on its core routes. Other routes (secondary modules,
  // legacy pages) keep the desktop layout + drawer so they stay usable on
  // mobile until they have their own mobile screens.
  if (isMobile && MOBILE_PWA_ROUTES.has(location.pathname)) return <MobileApp />

  const visibleItems = ALL_NAV_ITEMS.filter((item) => !item.hidden && item.ported)

  // Keep "Proyectos" active when on a project-detail route.
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    if (path === '/proyectos') return location.pathname.startsWith('/proyectos')
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const topbar = REDESIGNED_ROUTES[location.pathname]

  const companyName = activeCompany?.razonSocial ?? 'DECOLSA Ingeniería'
  const companySub = activeCompany?.rfc
    ? `S.A. DE C.V. · ${activeCompany.rfc}`
    : 'Construcción · contabilidad-os'
  const initials = (user?.name || user?.email || 'JB')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  return (
    <div className="ds-layout">
      <aside className={`ds ds-sidebar${menuOpen ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <BrandGlyph id={BRAND_LOGO} />
          </div>
          <div className="brand-txt">
            <div className="brand-name">{companyName}</div>
            <div className="brand-rfc">{companySub}</div>
          </div>
          <button
            className="ds-drawer-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="nav">
          {visibleItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="who" title={user?.email}>
            {user?.email ?? ''}
          </div>
          <a
            className="link"
            href="https://contabilidad-os-production.up.railway.app"
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="external" style={{ width: 13, height: 13 }} />
            contabilidad-os
          </a>
          <button className="logout" onClick={logout}>
            <Icon name="logout" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* mobile-only scrim behind the drawer */}
      <div
        className={`ds-scrim${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <div className="ds-main">
        {/* mobile-only top bar: hamburger + brand (the only menu access on phones) */}
        <header className="ds ds-mobilebar">
          <button
            className="ds-menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <Icon name="menu" />
          </button>
          <div className="brand-mark ds-mobilebar-mark">
            <BrandGlyph id={BRAND_LOGO} />
          </div>
          <div className="ds-mobilebar-name">{companyName}</div>
        </header>

        {topbar && (
          <header className="ds ds-topbar">
            <div>
              <h1 className="topbar-title">{topbar.title}</h1>
              {topbar.sub && <span className="topbar-sub">{topbar.sub}</span>}
            </div>
            <div className="spacer" />
            <div className="searchbox">
              <Icon name="search" />
              <span>Buscar proyecto, concepto…</span>
              <kbd>⌘K</kbd>
            </div>
            <button className="icon-btn" aria-label="Mensajes">
              <Icon name="message" />
            </button>
            <button className="icon-btn" aria-label="Notificaciones">
              <Icon name="bell" />
              <span className="dot" />
            </button>
            <div className="avatar">{initials || 'JB'}</div>
          </header>
        )}
        <main className="ds-content">{children}</main>
      </div>
    </div>
  )
}

export default Layout
