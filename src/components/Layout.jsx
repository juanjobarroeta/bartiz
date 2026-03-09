import { Link, useLocation } from 'react-router-dom'
import './Layout.css'

const Layout = ({ children }) => {
  const location = useLocation()

  const mainNavItems = [
    { path: '/', label: 'Dashboard', icon: '⊞' },
    { path: '/proyectos', label: 'Proyectos', icon: '📋' },
    { path: '/presupuestos', label: 'Presupuestos', icon: '💼' },
    { path: '/catalogo', label: 'Catálogo', icon: '📚' },
    { path: '/solicitudes-compra', label: 'Solicitudes', icon: '📝' },
    { path: '/tesoreria', label: 'Tesorería', icon: '💰' },
    { path: '/compras', label: 'Compras', icon: '📈' },
    { path: '/proveedores', label: 'Proveedores', icon: '🏢' },
    { path: '/clientes', label: 'Clientes', icon: '👥' },
    { path: '/empleados', label: 'Empleados', icon: '👷' },
    { path: '/usuarios', label: 'Usuarios', icon: '👤' },
    { path: '/inventario', label: 'Inventario', icon: '📦' },
    { path: '/contabilidad', label: 'Contabilidad', icon: '📊' }
  ]

  const bottomNavItems = [
    { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
    { path: '/ayuda', label: 'Ayuda', icon: '❓' }
  ]

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="company-logo">
            <div className="logo-icon">B</div>
            <div className="company-info">
              <span className="company-name">Bartiz</span>
              <span className="company-sub">Construcción S.A.</span>
            </div>
          </div>
          <button className="company-toggle">⌃</button>
        </div>
        
        <nav className="nav">
          {mainNavItems.map((item) => (
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
          {bottomNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
          <button className="nav-link logout-btn">
            <span className="nav-icon">↩</span>
            <span className="nav-label">Cerrar Sesión</span>
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default Layout
