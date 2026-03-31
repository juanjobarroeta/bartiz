import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
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
import PresupuestoProyecto from './pages/PresupuestoProyecto'
import Cotizaciones from './pages/Cotizaciones'
import CotizacionDetalle from './pages/CotizacionDetalle'
import Inventario from './pages/Inventario'
import Catalogo from './pages/Catalogo'
import Compras from './pages/Compras'
import SolicitudesCompra from './pages/SolicitudesCompra'
import Usuarios from './pages/Usuarios'

function App() {
  return (
    <Router>
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
          <Route path="/presupuesto/:proyectoId" element={<PresupuestoProyecto />} />
          <Route path="/cotizaciones" element={<Cotizaciones />} />
          <Route path="/cotizacion/:id" element={<CotizacionDetalle />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/compras" element={<Compras />} />
          <Route path="/solicitudes-compra" element={<SolicitudesCompra />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

