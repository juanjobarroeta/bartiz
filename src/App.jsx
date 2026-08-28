import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { rutaPermitida, homePermitida } from './auth/roles'
import Layout from './components/Layout'
import { DialogHost } from './components/Dialog'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Proyectos from './pages/Proyectos'
import ProyectoDetalle from './pages/ProyectoDetalle'
import Catalogo from './pages/Catalogo'
import APU from './pages/APU'
import PresupuestoDetalle from './pages/PresupuestoDetalle'
import Estimaciones from './pages/Estimaciones'
import EstimacionViviendasDetalle from './pages/EstimacionViviendasDetalle'
import Gastos from './pages/Gastos'
import Reembolsos from './pages/Reembolsos'
import ReembolsoDetalle from './pages/ReembolsoDetalle'
import Destajo from './pages/Destajo'
import Requisiciones from './pages/Requisiciones'
import RequisicionDetalle from './pages/RequisicionDetalle'
import ComprasPorAutorizar from './pages/ComprasPorAutorizar'
import TesoreriaBartiz from './pages/TesoreriaBartiz'
import CuentasPorPagar from './pages/CuentasPorPagar'
import CuentasProveedores from './pages/CuentasProveedores'
import Facturas from './pages/Facturas'
import Reportes from './pages/Reportes'
import Usuarios from './pages/Usuarios'
import ProveedoresBartiz from './pages/ProveedoresBartiz'
import ProveedorBartizDetalle from './pages/ProveedorBartizDetalle'

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

/**
 * Gate por rol de construcción: TESORERIA sólo ve su cola de pagos y
 * RESIDENTE sus rutas (requisiciones, obras/presupuestos en lectura, caja
 * chica). Cualquier otra ruta redirige al home del rol. El backend aplica
 * la misma allowlist sobre los endpoints, esto es sólo la capa de UX.
 */
function RolGate({ children }) {
  const { rol, paginas } = useAuth()
  const location = useLocation()
  if (!rutaPermitida(rol, location.pathname, paginas)) {
    return <Navigate to={homePermitida(rol, paginas)} replace />
  }
  return children
}

function App() {
  return (
    <AuthProvider>
      <DialogHost />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <RolGate>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/proyectos" element={<Proyectos />} />
                    <Route path="/proyectos/:id" element={<ProyectoDetalle />} />
                    <Route path="/catalogo" element={<Catalogo />} />
                    <Route path="/apu/:conceptoId" element={<APU />} />
                    <Route path="/presupuesto/:id" element={<PresupuestoDetalle />} />
                    <Route path="/estimaciones/:proyectoId" element={<Estimaciones />} />
                    <Route path="/estimacion-viviendas/:id" element={<EstimacionViviendasDetalle />} />
                    <Route path="/gastos" element={<Gastos />} />
                    <Route path="/reembolsos" element={<Reembolsos />} />
                    <Route path="/reembolsos/:id" element={<ReembolsoDetalle />} />
                    <Route path="/caja-chica" element={<Reembolsos />} />
                    <Route path="/caja-chica/:id" element={<ReembolsoDetalle />} />
                    <Route path="/destajo" element={<Destajo />} />
                    <Route path="/requisiciones" element={<Requisiciones />} />
                    <Route path="/requisiciones/:id" element={<RequisicionDetalle />} />
                    <Route path="/compras-por-autorizar" element={<ComprasPorAutorizar />} />
                    <Route path="/tesoreria-bartiz" element={<TesoreriaBartiz />} />
                    <Route path="/cuentas-por-pagar" element={<CuentasPorPagar />} />
                    {/* Feed de la tesorera: la misma cola, pre-filtrada a lo que
                        admin ya mandó a pagar (etapa En tesorería). */}
                    <Route path="/pagos-tesoreria" element={<CuentasPorPagar etapaInicial="enTesoreria" />} />
                    <Route path="/cuentas-proveedores" element={<CuentasProveedores />} />
                    <Route path="/facturas" element={<Facturas />} />
                    <Route path="/reportes" element={<Reportes />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                    <Route path="/proveedores-bartiz" element={<ProveedoresBartiz />} />
                    <Route path="/proveedores-bartiz/:id" element={<ProveedorBartizDetalle />} />
                  </Routes>
                </Layout>
                </RolGate>
              </RequireAuth>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
