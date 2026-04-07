import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Proyectos from './pages/Proyectos'
import ProyectoDetalle from './pages/ProyectoDetalle'
import Clientes from './pages/Clientes'
import Empleados from './pages/Empleados'
import Proveedores from './pages/Proveedores'
import ProveedorDetalle from './pages/ProveedorDetalle'
import Tesoreria from './pages/Tesoreria'
import Contabilidad from './pages/Contabilidad'
import Presupuestos from './pages/Presupuestos'
// TODO: PresupuestoProyecto.jsx has a pre-existing JSX syntax error (~line 698)
// that blocks `vite build`. Temporarily removed from the build until the page
// is rewritten to use contabilidad-os /api/construccion/presupuestos endpoints.
// import PresupuestoProyecto from './pages/PresupuestoProyecto'
import Cotizaciones from './pages/Cotizaciones'
import CotizacionDetalle from './pages/CotizacionDetalle'
import Inventario from './pages/Inventario'
import Catalogo from './pages/Catalogo'
import APU from './pages/APU'
import Compras from './pages/Compras'
import SolicitudesCompra from './pages/SolicitudesCompra'
import Usuarios from './pages/Usuarios'

/**
 * Gate: if the user isn't authenticated, redirect to /login.
 * While AuthProvider is still rehydrating from localStorage we render
 * nothing to avoid a login flash on reload.
 */
function RequireAuth({ children }) {
  const { isAuthenticated, booting } = useAuth()
  if (booting) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/proyectos" element={<Proyectos />} />
                    <Route path="/proyectos/:id" element={<ProyectoDetalle />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/empleados" element={<Empleados />} />
                    <Route path="/proveedores" element={<Proveedores />} />
                    <Route path="/proveedores/:id" element={<ProveedorDetalle />} />
                    <Route path="/tesoreria" element={<Tesoreria />} />
                    <Route path="/contabilidad" element={<Contabilidad />} />
                    <Route path="/presupuestos" element={<Presupuestos />} />
                    {/* <Route path="/presupuesto/:proyectoId" element={<PresupuestoProyecto />} /> */}
                    <Route path="/cotizaciones" element={<Cotizaciones />} />
                    <Route path="/cotizacion/:id" element={<CotizacionDetalle />} />
                    <Route path="/inventario" element={<Inventario />} />
                    <Route path="/catalogo" element={<Catalogo />} />
                    <Route path="/apu/:conceptoId" element={<APU />} />
                    <Route path="/compras" element={<Compras />} />
                    <Route path="/solicitudes-compra" element={<SolicitudesCompra />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                  </Routes>
                </Layout>
              </RequireAuth>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
