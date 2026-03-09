import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './ProyectoDetalle.css'
import './Shared.css'
import './Dashboard.css'

const ProveedorDetalle = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tabActiva, setTabActiva] = useState('pagos')
  const [proveedor, setProveedor] = useState(null)
  const [pagos, setPagos] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtros para pagos
  const [busqueda, setBusqueda] = useState('')
  const [filtroProyecto, setFiltroProyecto] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroMetodo, setFiltroMetodo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  useEffect(() => {
    // Cargar proveedor
    fetch(`/api/proveedores/${id}`)
      .then(res => res.json())
      .then(data => {
        setProveedor(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Cargar todos los pagos
    fetch('/api/pagos')
      .then(res => res.json())
      .then(data => setPagos(data))
      .catch(() => setPagos([]))

    // Cargar todas las solicitudes
    fetch('/api/solicitudes')
      .then(res => res.json())
      .then(data => setSolicitudes(data))
      .catch(() => setSolicitudes([]))
  }, [id])

  if (loading) {
    return <div className="page-container">Cargando...</div>
  }

  if (!proveedor) {
    return (
      <div className="page-container">
        <h1>Proveedor no encontrado</h1>
        <button className="btn" onClick={() => navigate('/proveedores')}>
          Volver a Proveedores
        </button>
      </div>
    )
  }

  // Filtrar pagos del proveedor
  const pagosProveedor = pagos.filter(p => p.beneficiario === proveedor.nombre)
  const solicitudesProveedor = solicitudes.filter(s => s.proveedorNombre === proveedor.nombre)

  // Aplicar filtros de búsqueda
  const pagosFiltrados = pagosProveedor.filter(pago => {
    const matchBusqueda = busqueda === '' || 
      pago.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
      pago.referencia.toLowerCase().includes(busqueda.toLowerCase()) ||
      pago.proyecto.toLowerCase().includes(busqueda.toLowerCase())
    
    const matchProyecto = filtroProyecto === '' || pago.proyecto === filtroProyecto
    const matchCategoria = filtroCategoria === '' || pago.categoria === filtroCategoria
    const matchMetodo = filtroMetodo === '' || pago.metodoPago === filtroMetodo
    const matchEstado = filtroEstado === '' || pago.estado === filtroEstado

    return matchBusqueda && matchProyecto && matchCategoria && matchMetodo && matchEstado
  })

  // Obtener proyectos únicos
  const proyectosUnicos = [...new Set(pagosProveedor.map(p => p.proyecto))]
  
  // Calcular estadísticas
  const totalPagado = pagosProveedor.reduce((sum, p) => sum + p.monto, 0)
  const numeroPagos = pagosProveedor.length
  const ticketPromedio = numeroPagos > 0 ? totalPagado / numeroPagos : 0
  const ultimoPago = pagosProveedor.length > 0 
    ? pagosProveedor.sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago))[0]
    : null

  const tabs = [
    { id: 'pagos', label: 'Historial de Pagos', icon: '💰', badge: pagosFiltrados.length },
    { id: 'solicitudes', label: 'Órdenes de Compra', icon: '📝', badge: solicitudesProveedor.length },
    { id: 'analisis', label: 'Análisis', icon: '📊' },
    { id: 'info', label: 'Información', icon: '📋' }
  ]

  const getCalificacionStars = (calificacion) => {
    return '★'.repeat(calificacion) + '☆'.repeat(5 - calificacion)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="proyecto-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/proveedores')}>
            ← Volver
          </button>
          <h1>{proveedor.nombre}</h1>
          <div className="proyecto-meta">
            <span className="meta-item">
              🏢 {proveedor.razonSocial}
            </span>
            <span className="meta-item">
              📄 RFC: {proveedor.rfc}
            </span>
            <span className="meta-item">
              📍 {proveedor.ciudad}
            </span>
            <span className="meta-item" style={{ color: '#F59E0B' }}>
              {getCalificacionStars(proveedor.calificacion)}
            </span>
          </div>
        </div>
        <div className="proyecto-stats-mini">
          <div className="stat-mini">
            <div className="label">Total Pagado</div>
            <div className="value">${totalPagado.toLocaleString('es-MX')}</div>
          </div>
          <div className="stat-mini">
            <div className="label">Saldo Pendiente</div>
            <div className="value">${(proveedor.saldoPendiente || 0).toLocaleString('es-MX')}</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-container">
        <div className="tabs-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${tabActiva === tab.id ? 'active' : ''}`}
              onClick={() => setTabActiva(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {tab.badge > 0 && <span className="tab-badge">{tab.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {tabActiva === 'pagos' && (
          <HistorialPagosTab 
            pagos={pagosFiltrados}
            pagosCompletos={pagosProveedor}
            proyectosUnicos={proyectosUnicos}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            filtroProyecto={filtroProyecto}
            setFiltroProyecto={setFiltroProyecto}
            filtroCategoria={filtroCategoria}
            setFiltroCategoria={setFiltroCategoria}
            filtroMetodo={filtroMetodo}
            setFiltroMetodo={setFiltroMetodo}
            filtroEstado={filtroEstado}
            setFiltroEstado={setFiltroEstado}
          />
        )}
        {tabActiva === 'solicitudes' && (
          <SolicitudesTab solicitudes={solicitudesProveedor} />
        )}
        {tabActiva === 'analisis' && (
          <AnalisisProveedorTab 
            proveedor={proveedor}
            pagos={pagosProveedor}
            solicitudes={solicitudesProveedor}
            totalPagado={totalPagado}
            numeroPagos={numeroPagos}
            ticketPromedio={ticketPromedio}
            ultimoPago={ultimoPago}
            proyectosUnicos={proyectosUnicos}
          />
        )}
        {tabActiva === 'info' && (
          <InformacionTab proveedor={proveedor} />
        )}
      </div>
    </div>
  )
}

// ==================== HISTORIAL DE PAGOS TAB ====================
const HistorialPagosTab = ({ 
  pagos, 
  pagosCompletos,
  proyectosUnicos,
  busqueda,
  setBusqueda,
  filtroProyecto,
  setFiltroProyecto,
  filtroCategoria,
  setFiltroCategoria,
  filtroMetodo,
  setFiltroMetodo,
  filtroEstado,
  setFiltroEstado
}) => {
  const totalMostrado = pagos.reduce((sum, p) => sum + p.monto, 0)

  const getEstadoBadgeClass = (estado) => {
    switch(estado) {
      case 'pagado': return 'badge-black'
      case 'pendiente': return 'badge-beige'
      case 'programado': return 'badge-gray'
      default: return 'badge-gray'
    }
  }

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroProyecto('')
    setFiltroCategoria('')
    setFiltroMetodo('')
    setFiltroEstado('')
  }

  return (
    <div>
      {/* Filtros Avanzados */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Filtros de Búsqueda</h3>
        
        {/* Búsqueda */}
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="label">🔍 Buscar</label>
          <input
            type="text"
            className="input"
            placeholder="Buscar por concepto, proyecto, referencia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Filtros en fila */}
        <div className="form-row" style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label className="label">Proyecto</label>
            <select
              className="input"
              value={filtroProyecto}
              onChange={(e) => setFiltroProyecto(e.target.value)}
            >
              <option value="">Todos los proyectos</option>
              {proyectosUnicos.map((proyecto, idx) => (
                <option key={idx} value={proyecto}>{proyecto}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Categoría</label>
            <select
              className="input"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              <option value="materiales">Materiales</option>
              <option value="equipos">Equipos</option>
              <option value="servicios">Servicios</option>
              <option value="nomina">Nómina</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Método de Pago</label>
            <select
              className="input"
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
            >
              <option value="">Todos los métodos</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Estado</label>
            <select
              className="input"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="pagado">Pagado</option>
              <option value="pendiente">Pendiente</option>
              <option value="programado">Programado</option>
            </select>
          </div>
        </div>

        {/* Botón limpiar filtros */}
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            className="btn"
            onClick={limpiarFiltros}
            style={{ fontSize: '0.875rem' }}
          >
            🗑️ Limpiar Filtros
          </button>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
            Mostrando {pagos.length} de {pagosCompletos.length} pagos
          </div>
        </div>
      </div>

      {/* Resumen de resultados */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="label">Pagos Mostrados</div>
          <div className="stat-value">{pagos.length}</div>
        </div>
        <div className="stat-card stat-card-highlight">
          <div className="label">Monto Total Mostrado</div>
          <div className="stat-value">${totalMostrado.toLocaleString('es-MX')}</div>
        </div>
      </div>

      {/* Tabla de Pagos */}
      <div className="card">
        <h3>Detalle de Pagos</h3>
        <div className="table-container" style={{ marginTop: '1rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proyecto</th>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Referencia</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray)' }}>
                    {pagosCompletos.length === 0 
                      ? 'No hay pagos registrados a este proveedor'
                      : 'No se encontraron pagos con los filtros seleccionados'
                    }
                  </td>
                </tr>
              ) : (
                pagos
                  .sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago))
                  .map(pago => (
                    <tr key={pago.id}>
                      <td>{new Date(pago.fechaPago).toLocaleDateString('es-MX')}</td>
                      <td><strong>{pago.proyecto}</strong></td>
                      <td>{pago.concepto}</td>
                      <td>
                        <span className="badge badge-gray">
                          {pago.categoria}
                        </span>
                      </td>
                      <td><strong>${pago.monto.toLocaleString('es-MX')}</strong></td>
                      <td><code>{pago.metodoPago}</code></td>
                      <td><code>{pago.referencia}</code></td>
                      <td>
                        <span className={`badge ${getEstadoBadgeClass(pago.estado)}`}>
                          {pago.estado}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ==================== SOLICITUDES TAB ====================
const SolicitudesTab = ({ solicitudes }) => {
  const getEstadoBadgeClass = (estado) => {
    switch(estado) {
      case 'pendiente': return 'badge-gray'
      case 'aprobada': return 'badge-beige'
      case 'completada': return 'badge-black'
      case 'rechazada': return 'badge-white'
      default: return 'badge-gray'
    }
  }

  return (
    <div className="card">
      <h3>Órdenes de Compra</h3>
      <div className="table-container" style={{ marginTop: '1rem' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proyecto</th>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th>Monto Est.</th>
              <th>Prioridad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray)' }}>
                  No hay solicitudes para este proveedor
                </td>
              </tr>
            ) : (
              solicitudes.map(sol => (
                <tr key={sol.id}>
                  <td>{new Date(sol.fechaSolicitud).toLocaleDateString('es-MX')}</td>
                  <td><strong>{sol.proyecto}</strong></td>
                  <td>{sol.descripcion}</td>
                  <td><code>{sol.cantidad} {sol.unidad}</code></td>
                  <td><strong>${(sol.montoEstimado || 0).toLocaleString('es-MX')}</strong></td>
                  <td><code>{sol.prioridad}</code></td>
                  <td>
                    <span className={`badge ${getEstadoBadgeClass(sol.estado)}`}>
                      {sol.estado}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ==================== ANÁLISIS TAB ====================
const AnalisisProveedorTab = ({ 
  proveedor, 
  pagos, 
  solicitudes,
  totalPagado,
  numeroPagos,
  ticketPromedio,
  ultimoPago,
  proyectosUnicos
}) => {
  // Pagos por categoría
  const pagosPorCategoria = pagos.reduce((acc, pago) => {
    const cat = pago.categoria || 'otros'
    acc[cat] = (acc[cat] || 0) + pago.monto
    return acc
  }, {})

  // Pagos por mes
  const pagosPorMes = pagos.reduce((acc, pago) => {
    const mes = new Date(pago.fechaPago).toLocaleDateString('es-MX', { year: 'numeric', month: 'short' })
    acc[mes] = (acc[mes] || 0) + pago.monto
    return acc
  }, {})

  return (
    <div>
      {/* KPIs */}
      <div className="stats-grid">
        <div className="stat-card stat-card-highlight">
          <div className="label">Total Histórico Pagado</div>
          <div className="stat-value">${totalPagado.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card">
          <div className="label">Número de Pagos</div>
          <div className="stat-value">{numeroPagos}</div>
        </div>
        <div className="stat-card">
          <div className="label">Ticket Promedio</div>
          <div className="stat-value">${ticketPromedio.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="stat-card">
          <div className="label">Proyectos Trabajados</div>
          <div className="stat-value">{proyectosUnicos.length}</div>
        </div>
      </div>

      {/* Último Pago */}
      {ultimoPago && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>Último Pago Realizado</h3>
          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <div className="label">Fecha</div>
              <div>{new Date(ultimoPago.fechaPago).toLocaleDateString('es-MX')}</div>
            </div>
            <div>
              <div className="label">Monto</div>
              <div><strong>${ultimoPago.monto.toLocaleString('es-MX')}</strong></div>
            </div>
            <div>
              <div className="label">Concepto</div>
              <div>{ultimoPago.concepto}</div>
            </div>
            <div>
              <div className="label">Proyecto</div>
              <div>{ultimoPago.proyecto}</div>
            </div>
          </div>
        </div>
      )}

      {/* Distribución por Categoría */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Distribución por Categoría</h3>
        <div style={{ marginTop: '1rem' }}>
          {Object.entries(pagosPorCategoria).map(([categoria, monto]) => {
            const porcentaje = (monto / totalPagado) * 100
            return (
              <div key={categoria} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="label">{categoria.toUpperCase()}</span>
                  <span><strong>${monto.toLocaleString('es-MX')}</strong> ({porcentaje.toFixed(1)}%)</span>
                </div>
                <div style={{ 
                  height: '8px', 
                  background: 'var(--color-bg)', 
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${porcentaje}%`,
                    background: 'var(--color-black)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ==================== INFORMACIÓN TAB ====================
const InformacionTab = ({ proveedor }) => {
  const getCalificacionStars = (calificacion) => {
    return '★'.repeat(calificacion) + '☆'.repeat(5 - calificacion)
  }

  return (
    <div>
      <div className="card">
        <h3>Información General</h3>
        <div className="info-grid" style={{ marginTop: '1.5rem' }}>
          <div className="info-item">
            <label className="label">Nombre Comercial</label>
            <div><strong>{proveedor.nombre}</strong></div>
          </div>
          <div className="info-item">
            <label className="label">Razón Social</label>
            <div>{proveedor.razonSocial}</div>
          </div>
          <div className="info-item">
            <label className="label">RFC</label>
            <div><code>{proveedor.rfc}</code></div>
          </div>
          <div className="info-item">
            <label className="label">Categoría</label>
            <div><span className="badge badge-gray">{proveedor.categoria}</span></div>
          </div>
          <div className="info-item">
            <label className="label">Contacto Principal</label>
            <div>{proveedor.contacto}</div>
          </div>
          <div className="info-item">
            <label className="label">Email</label>
            <div>{proveedor.email}</div>
          </div>
          <div className="info-item">
            <label className="label">Teléfono</label>
            <div><code>{proveedor.telefono}</code></div>
          </div>
          <div className="info-item">
            <label className="label">Ciudad</label>
            <div>{proveedor.ciudad}</div>
          </div>
          <div className="info-item">
            <label className="label">Dirección</label>
            <div>{proveedor.direccion}</div>
          </div>
          <div className="info-item">
            <label className="label">Código Postal</label>
            <div>{proveedor.codigoPostal}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Condiciones Comerciales</h3>
        <div className="info-grid" style={{ marginTop: '1.5rem' }}>
          <div className="info-item">
            <label className="label">Condiciones de Pago</label>
            <div><strong>{proveedor.condicionesPago}</strong></div>
          </div>
          <div className="info-item">
            <label className="label">Crédito Disponible</label>
            <div><strong>${(proveedor.creditoDisponible || 0).toLocaleString('es-MX')}</strong></div>
          </div>
          <div className="info-item">
            <label className="label">Saldo Pendiente</label>
            <div style={{ color: proveedor.saldoPendiente > 0 ? '#B45309' : 'inherit' }}>
              <strong>${(proveedor.saldoPendiente || 0).toLocaleString('es-MX')}</strong>
            </div>
          </div>
          <div className="info-item">
            <label className="label">Calificación</label>
            <div style={{ color: '#F59E0B', fontSize: '1.25rem' }}>
              {getCalificacionStars(proveedor.calificacion)}
            </div>
          </div>
        </div>
      </div>

      {proveedor.notas && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>Notas</h3>
          <p style={{ marginTop: '1rem', lineHeight: '1.6' }}>{proveedor.notas}</p>
        </div>
      )}
    </div>
  )
}

export default ProveedorDetalle




