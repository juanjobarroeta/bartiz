/**
 * Layout / sidebar.
 *
 * Only shows pages that have been ported to the contabilidad-os backend.
 * Pages still hitting the old Express server are hidden (and marked with
 * `ported: false` below) until they're migrated. Duplicates of contabilidad-os
 * native UI (clientes, empleados, proveedores, contabilidad, tesoreria,
 * usuarios) are permanently hidden — users manage those in contabilidad-os.
 *
 * When porting a page, flip its `ported: true` flag and it appears in the nav.
 */

import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Layout.css'

// Nav structure — reorganized in Sprint 1 to separate top-level workflows
// (Gerardo's compras, Rosy's caja chica, Katia's gastos) from the
// project-detail context. Each surface owns its own page so things
// don't pile up inside ProyectoDetalle tabs.
const ALL_NAV_ITEMS = [
  { path: '/',                    label: 'Dashboard',     icon: '⊞',  ported: false, note: 'pending port' },
  { path: '/proyectos',           label: 'Proyectos',     icon: '📋', ported: true },
  { path: '/catalogo',            label: 'Catálogo',      icon: '📚', ported: true },
  { path: '/requisiciones',       label: 'Requisiciones', icon: '📝', ported: true },
  { path: '/gastos',              label: 'Gastos',        icon: '💸', ported: true },
  { path: '/caja-chica',          label: 'Caja Chica',    icon: '📦', ported: true },
  { path: '/destajo',             label: 'Destajo',       icon: '👷', ported: true },
  { path: '/tesoreria-bartiz',    label: 'Tesorería',     icon: '🏦', ported: true },
  { path: '/reportes',            label: 'Reportes',      icon: '📊', ported: false, note: 'Sprint 4' },

  // Permanently hidden — contabilidad-os native UI owns these. Users go there.
  { path: '/clientes',            label: 'Clientes',      icon: '👥', ported: false, hidden: true, reason: 'owned by contabilidad-os' },
  { path: '/empleados',           label: 'Empleados',     icon: '👷', ported: false, hidden: true, reason: 'owned by contabilidad-os' },
  { path: '/proveedores',         label: 'Proveedores',   icon: '🏢', ported: false, hidden: true, reason: 'owned by contabilidad-os' },
  { path: '/tesoreria',           label: 'Tesorería (legacy)', icon: '💰', ported: false, hidden: true, reason: 'owned by contabilidad-os' },
  { path: '/contabilidad',        label: 'Contabilidad',  icon: '📊', ported: false, hidden: true, reason: 'owned by contabilidad-os' },
  { path: '/usuarios',            label: 'Usuarios',      icon: '👤', ported: false, hidden: true, reason: 'owned by contabilidad-os' },

  // Deprecated — kept hidden until referrers are gone
  { path: '/reembolsos',          label: 'Reembolsos',    icon: '📦', ported: false, hidden: true, reason: 'renamed to Caja Chica' },
  { path: '/solicitudes-compra',  label: 'Solicitudes',   icon: '📝', ported: false, hidden: true, reason: 'merged into Requisiciones (Sprint 2)' },
]

const Layout = ({ children }) => {
  const location = useLocation()
  const { user, activeCompany, logout } = useAuth()

  const visibleItems = ALL_NAV_ITEMS.filter((item) => !item.hidden && item.ported)

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="company-logo">
            <div className="logo-icon">B</div>
            <div className="company-info">
              <span className="company-name">
                {activeCompany?.razonSocial ?? 'bartiz'}
              </span>
              <span className="company-sub">
                {activeCompany?.rfc ?? 'Construcción'}
              </span>
            </div>
          </div>
        </div>

        <nav className="nav">
          {visibleItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-block">
            <div className="user-email" title={user?.email}>
              {user?.email ?? ''}
            </div>
            <a
              className="nav-link external"
              href="https://contabilidad-os-production.up.railway.app"
              target="_blank"
              rel="noreferrer"
            >
              <span className="nav-icon">↗</span>
              <span className="nav-label">contabilidad-os</span>
            </a>
          </div>
          <button className="nav-link logout-btn" onClick={logout}>
            <span className="nav-icon">↩</span>
            <span className="nav-label">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  )
}

export default Layout
