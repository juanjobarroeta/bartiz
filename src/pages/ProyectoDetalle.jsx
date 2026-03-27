import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './ProyectoDetalle.css'
import './Shared.css'
import { api } from '../config/api'

const ProyectoDetalle = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tabActiva, setTabActiva] = useState('overview')
  const [proyecto, setProyecto] = useState(null)
  const [pagos, setPagos] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cargar proyecto
    fetch(api(`/api/proyectos/${id}`))
      .then(res => res.json())
      .then(data => {
        setProyecto(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Cargar datos relacionados
    Promise.all([
      fetch(api('/api/pagos')).then(r => r.json()),
      fetch(api('/api/solicitudes')).then(r => r.json()),
      fetch(api('/api/contabilidad')).then(r => r.json()),
      fetch(api('/api/empleados')).then(r => r.json())
    ]).then(([pagosData, solicitudesData, contabilidadData, empleadosData]) => {
      setPagos(pagosData)
      setSolicitudes(solicitudesData)
      setMovimientos(contabilidadData)
      setEmpleados(empleadosData)
    }).catch(err => console.error('Error cargando datos:', err))
  }, [id])

  if (loading) {
    return <div className="page-container">Cargando...</div>
  }

  if (!proyecto) {
    return (
      <div className="page-container">
        <h1>Proyecto no encontrado</h1>
        <button className="btn" onClick={() => navigate('/proyectos')}>
          Volver a Proyectos
        </button>
      </div>
    )
  }

  // Filtrar datos por proyecto
  const pagosProyecto = pagos.filter(p => p.proyecto === proyecto.nombre)
  const solicitudesProyecto = solicitudes.filter(s => s.proyecto === proyecto.nombre)
  const movimientosProyecto = movimientos.filter(m => m.proyecto === proyecto.nombre)

  // Calcular estadísticas
  const totalPagado = pagosProyecto.reduce((sum, p) => sum + p.monto, 0)
  const totalSolicitado = solicitudesProyecto.length
  const solicitudesPendientes = solicitudesProyecto.filter(s => s.estado === 'pendiente').length

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: '📋' },
    { id: 'estimaciones', label: 'Estimaciones', icon: '💰' },
    { id: 'costos', label: 'Costos Reales', icon: '📊' },
    { id: 'pagos', label: 'Pagos', icon: '💳', badge: pagosProyecto.length },
    { id: 'solicitudes', label: 'Solicitudes', icon: '📝', badge: solicitudesPendientes },
    { id: 'analisis', label: 'Análisis', icon: '📈' }
  ]

  const getEstadoBadgeClass = (estado) => {
    switch(estado) {
      case 'Planeación': return 'badge-gray'
      case 'En Progreso': return 'badge-beige'
      case 'Pausado': return 'badge-white'
      case 'Completado': return 'badge-black'
      default: return 'badge-gray'
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="proyecto-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/proyectos')}>
            ← Volver
          </button>
          <h1>{proyecto.nombre}</h1>
          <div className="proyecto-meta">
            <span className={`badge ${getEstadoBadgeClass(proyecto.estado)}`}>
              {proyecto.estado}
            </span>
            <span className="meta-item">
              📍 {proyecto.ubicacion}
            </span>
            <span className="meta-item">
              👤 {proyecto.cliente}
            </span>
            <span className="meta-item">
              📅 Inicio: {new Date(proyecto.fechaInicio).toLocaleDateString('es-MX')}
            </span>
          </div>
        </div>
        <div className="proyecto-stats-mini">
          <div className="stat-mini">
            <div className="label">Presupuesto</div>
            <div className="value">${proyecto.presupuesto?.toLocaleString('es-MX') || 0}</div>
          </div>
          <div className="stat-mini">
            <div className="label">Pagado</div>
            <div className="value">${totalPagado.toLocaleString('es-MX')}</div>
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
        {tabActiva === 'overview' && (
          <OverviewTab proyecto={proyecto} solicitudes={solicitudesProyecto} pagos={pagosProyecto} />
        )}
        {tabActiva === 'estimaciones' && (
          <EstimacionesTab proyecto={proyecto} movimientos={movimientosProyecto} />
        )}
        {tabActiva === 'costos' && (
          <CostosRealesTab proyecto={proyecto} movimientos={movimientosProyecto} />
        )}
        {tabActiva === 'pagos' && (
          <PagosTab pagos={pagosProyecto} />
        )}
        {tabActiva === 'solicitudes' && (
          <SolicitudesTab 
            solicitudes={solicitudesProyecto} 
            setSolicitudes={setSolicitudes}
            proyecto={proyecto}
          />
        )}
        {tabActiva === 'analisis' && (
          <AnalisisTab 
            proyecto={proyecto} 
            pagos={pagosProyecto} 
            movimientos={movimientosProyecto}
          />
        )}
      </div>
    </div>
  )
}

// ==================== OVERVIEW TAB ====================
const OverviewTab = ({ proyecto, solicitudes, pagos }) => {
  const progreso = proyecto.progreso || 0
  const presupuesto = proyecto.presupuesto || 0
  const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0)
  const porcentajeGastado = presupuesto > 0 ? (totalPagado / presupuesto) * 100 : 0

  return (
    <div className="overview-container">
      <div className="overview-grid">
        <div className="card">
          <h3>Información General</h3>
          <div className="info-grid">
            <div className="info-item">
              <label className="label">Cliente</label>
              <div>{proyecto.cliente}</div>
            </div>
            <div className="info-item">
              <label className="label">Ubicación</label>
              <div>{proyecto.ubicacion}</div>
            </div>
            <div className="info-item">
              <label className="label">Fecha de Inicio</label>
              <div>{new Date(proyecto.fechaInicio).toLocaleDateString('es-MX')}</div>
            </div>
            <div className="info-item">
              <label className="label">Estado</label>
              <div>{proyecto.estado}</div>
            </div>
            <div className="info-item">
              <label className="label">Presupuesto Total</label>
              <div><strong>${presupuesto.toLocaleString('es-MX')}</strong></div>
            </div>
            <div className="info-item">
              <label className="label">Total Gastado</label>
              <div><strong>${totalPagado.toLocaleString('es-MX')}</strong></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Progreso del Proyecto</h3>
          <div className="progress-section">
            <div className="progress-label-row">
              <span className="label">Avance de Obra</span>
              <span className="progress-percent">{progreso}%</span>
            </div>
            <div className="progress-bar-large">
              <div 
                className="progress-fill-large" 
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-label-row">
              <span className="label">Presupuesto Utilizado</span>
              <span className="progress-percent">{porcentajeGastado.toFixed(1)}%</span>
            </div>
            <div className="progress-bar-large">
              <div 
                className="progress-fill-large budget-fill" 
                style={{ 
                  width: `${Math.min(porcentajeGastado, 100)}%`,
                  backgroundColor: porcentajeGastado > 90 ? '#000' : 'var(--color-beige)'
                }}
              />
            </div>
            <div className="budget-info">
              <span>Disponible: ${(presupuesto - totalPagado).toLocaleString('es-MX')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: '1.5rem' }}>
        <div className="stat-card">
          <div className="label">Solicitudes Activas</div>
          <div className="stat-value">{solicitudes.filter(s => s.estado === 'pendiente').length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Pagos</div>
          <div className="stat-value">{pagos.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Monto Promedio Pago</div>
          <div className="stat-value">
            ${pagos.length > 0 ? (totalPagado / pagos.length).toLocaleString('es-MX', { maximumFractionDigits: 0 }) : 0}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== ESTIMACIONES TAB ====================
const EstimacionesTab = ({ proyecto, movimientos }) => {
  // Conceptos de construcción con presupuesto y gasto real
  const [conceptos, setConceptos] = useState([
    { 
      id: 1, 
      codigo: '01',
      nombre: 'Preliminares', 
      presupuestado: proyecto.presupuesto * 0.05,
      gastado: proyecto.presupuesto * 0.048,
      descripcion: 'Limpieza, trazo, excavación, bodega temporal'
    },
    { 
      id: 2, 
      codigo: '02',
      nombre: 'Cimentación', 
      presupuestado: proyecto.presupuesto * 0.18,
      gastado: proyecto.presupuesto * 0.175,
      descripcion: 'Zapatas, contratrabes, plantilla'
    },
    { 
      id: 3, 
      codigo: '03',
      nombre: 'Estructura', 
      presupuestado: proyecto.presupuesto * 0.25,
      gastado: proyecto.presupuesto * 0.22,
      descripcion: 'Columnas, trabes, losas, acero de refuerzo'
    },
    { 
      id: 4, 
      codigo: '04',
      nombre: 'Albañilería', 
      presupuestado: proyecto.presupuesto * 0.15,
      gastado: proyecto.presupuesto * 0.12,
      descripcion: 'Muros, aplanados, firmes'
    },
    { 
      id: 5, 
      codigo: '05',
      nombre: 'Instalaciones Hidráulicas', 
      presupuestado: proyecto.presupuesto * 0.08,
      gastado: proyecto.presupuesto * 0.06,
      descripcion: 'Tuberías, conexiones, tinacos'
    },
    { 
      id: 6, 
      codigo: '06',
      nombre: 'Instalaciones Eléctricas', 
      presupuestado: proyecto.presupuesto * 0.10,
      gastado: proyecto.presupuesto * 0.08,
      descripcion: 'Cableado, tableros, contactos, iluminación'
    },
    { 
      id: 7, 
      codigo: '07',
      nombre: 'Acabados', 
      presupuestado: proyecto.presupuesto * 0.12,
      gastado: proyecto.presupuesto * 0.05,
      descripcion: 'Pisos, azulejos, pintura, herrería'
    },
    { 
      id: 8, 
      codigo: '08',
      nombre: 'Instalaciones Especiales', 
      presupuestado: proyecto.presupuesto * 0.05,
      gastado: proyecto.presupuesto * 0.02,
      descripcion: 'Aire acondicionado, gas, voz y datos'
    },
    { 
      id: 9, 
      codigo: '09',
      nombre: 'Urbanización', 
      presupuestado: proyecto.presupuesto * 0.02,
      gastado: 0,
      descripcion: 'Banquetas, jardines, estacionamiento'
    }
  ])

  const totalPresupuestado = conceptos.reduce((sum, c) => sum + c.presupuestado, 0)
  const totalGastado = conceptos.reduce((sum, c) => sum + c.gastado, 0)
  const totalDisponible = totalPresupuestado - totalGastado

  const getVarianceColor = (concepto) => {
    const variance = concepto.presupuestado - concepto.gastado
    const percentage = (variance / concepto.presupuestado) * 100
    if (percentage < 0) return '#000' // Sobregasto
    if (percentage < 10) return '#B45309' // Alerta
    return 'var(--color-text-light)' // OK
  }

  const getProgressColor = (concepto) => {
    const percentage = (concepto.gastado / concepto.presupuestado) * 100
    if (percentage > 100) return '#000' // Sobregasto
    if (percentage > 90) return 'var(--color-beige)' // Alerta
    return 'var(--color-black)' // Normal
  }

  return (
    <div className="estimaciones-container">
      {/* Resumen */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="label">Total Presupuestado</div>
          <div className="stat-value">${totalPresupuestado.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Gastado</div>
          <div className="stat-value">${totalGastado.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card stat-card-highlight">
          <div className="label">Disponible</div>
          <div className="stat-value">${totalDisponible.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card">
          <div className="label">% Ejecutado</div>
          <div className="stat-value">{((totalGastado / totalPresupuestado) * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Tabla de Conceptos */}
      <div className="card">
        <h3>Presupuesto por Concepto</h3>
        <div className="table-container" style={{ marginTop: '1rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Concepto</th>
                <th>Presupuestado</th>
                <th>Gastado</th>
                <th>Disponible</th>
                <th>% Ejecutado</th>
                <th>Avance</th>
              </tr>
            </thead>
            <tbody>
              {conceptos.map(concepto => {
                const disponible = concepto.presupuestado - concepto.gastado
                const porcentajeEjecutado = (concepto.gastado / concepto.presupuestado) * 100
                const sobregasto = disponible < 0

                return (
                  <tr key={concepto.id}>
                    <td><code>{concepto.codigo}</code></td>
                    <td>
                      <div>
                        <strong>{concepto.nombre}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>
                          {concepto.descripcion}
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>${concepto.presupuestado.toLocaleString('es-MX')}</strong>
                    </td>
                    <td>
                      ${concepto.gastado.toLocaleString('es-MX')}
                    </td>
                    <td style={{ 
                      color: getVarianceColor(concepto),
                      fontWeight: sobregasto ? 'bold' : 'normal'
                    }}>
                      {sobregasto && '⚠️ '}
                      ${disponible.toLocaleString('es-MX')}
                    </td>
                    <td>
                      <code style={{ 
                        color: porcentajeEjecutado > 100 ? '#000' : 'inherit',
                        fontWeight: porcentajeEjecutado > 100 ? 'bold' : 'normal'
                      }}>
                        {porcentajeEjecutado.toFixed(1)}%
                      </code>
                    </td>
                    <td style={{ width: '200px' }}>
                      <div style={{ 
                        height: '20px', 
                        background: 'var(--color-bg)', 
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(porcentajeEjecutado, 100)}%`,
                          background: getProgressColor(concepto),
                          transition: 'width 0.3s ease',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          paddingRight: '0.5rem',
                          color: 'white',
                          fontSize: '0.625rem',
                          fontWeight: 'bold'
                        }}>
                          {porcentajeEjecutado > 15 && `${porcentajeEjecutado.toFixed(0)}%`}
                        </div>
                      </div>
                      {porcentajeEjecutado > 100 && (
                        <div style={{ 
                          fontSize: '0.625rem', 
                          color: '#000', 
                          marginTop: '0.25rem',
                          fontWeight: 'bold'
                        }}>
                          Sobregasto: {(porcentajeEjecutado - 100).toFixed(1)}%
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold', background: 'var(--color-bg)' }}>
                <td colSpan="2">TOTAL</td>
                <td>${totalPresupuestado.toLocaleString('es-MX')}</td>
                <td>${totalGastado.toLocaleString('es-MX')}</td>
                <td style={{ color: totalDisponible < 0 ? '#000' : 'inherit' }}>
                  ${totalDisponible.toLocaleString('es-MX')}
                </td>
                <td>
                  <code>{((totalGastado / totalPresupuestado) * 100).toFixed(1)}%</code>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Gráfica Visual de Conceptos */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Distribución del Presupuesto</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {conceptos.map(concepto => {
            const porcentaje = (concepto.presupuestado / totalPresupuestado) * 100
            const ejecutado = (concepto.gastado / concepto.presupuestado) * 100
            return (
              <div 
                key={concepto.id}
                style={{
                  padding: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  background: ejecutado > 90 ? '#FEF3C7' : 'var(--color-white)'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {concepto.codigo} - {concepto.nombre}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                  {porcentaje.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                  del presupuesto total
                </div>
                <div style={{ 
                  marginTop: '0.5rem', 
                  fontSize: '0.75rem',
                  color: ejecutado > 100 ? '#000' : 'var(--color-text-light)'
                }}>
                  Ejecutado: {ejecutado.toFixed(0)}%
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ==================== COSTOS REALES TAB ====================
const CostosRealesTab = ({ proyecto, movimientos }) => {
  const egresos = movimientos.filter(m => m.tipo === 'egreso')
  
  // Agrupar por categoría
  const costosPorCategoria = egresos.reduce((acc, mov) => {
    const cat = mov.categoria || 'otros'
    if (!acc[cat]) {
      acc[cat] = { total: 0, count: 0, items: [] }
    }
    acc[cat].total += mov.monto
    acc[cat].count += 1
    acc[cat].items.push(mov)
    return acc
  }, {})

  const categorias = Object.keys(costosPorCategoria).map(cat => ({
    nombre: cat,
    ...costosPorCategoria[cat]
  }))

  const totalGastado = egresos.reduce((sum, e) => sum + e.monto, 0)

  return (
    <div className="costos-container">
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="label">Total Gastado</div>
          <div className="stat-value">${totalGastado.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card">
          <div className="label">Presupuesto Original</div>
          <div className="stat-value">${proyecto.presupuesto?.toLocaleString('es-MX') || 0}</div>
        </div>
        <div className="stat-card stat-card-highlight">
          <div className="label">Disponible</div>
          <div className="stat-value">
            ${((proyecto.presupuesto || 0) - totalGastado).toLocaleString('es-MX')}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Gastos por Categoría</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Cantidad Movimientos</th>
                <th>Total Gastado</th>
                <th>% del Proyecto</th>
                <th>Promedio por Movimiento</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((cat, idx) => {
                const porcentaje = (cat.total / totalGastado) * 100
                return (
                  <tr key={idx}>
                    <td><strong>{cat.nombre.charAt(0).toUpperCase() + cat.nombre.slice(1)}</strong></td>
                    <td><code>{cat.count}</code></td>
                    <td><strong>${cat.total.toLocaleString('es-MX')}</strong></td>
                    <td>{porcentaje.toFixed(1)}%</td>
                    <td>${(cat.total / cat.count).toLocaleString('es-MX')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ==================== PAGOS TAB ====================
const PagosTab = ({ pagos }) => {
  const getEstadoBadgeClass = (estado) => {
    switch(estado) {
      case 'pagado': return 'badge-black'
      case 'pendiente': return 'badge-beige'
      case 'programado': return 'badge-gray'
      default: return 'badge-gray'
    }
  }

  return (
    <div className="pagos-container">
      <div className="card">
        <h3>Historial de Pagos</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Beneficiario</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Referencia</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray)' }}>
                    No hay pagos registrados para este proyecto
                  </td>
                </tr>
              ) : (
                pagos.map(pago => (
                  <tr key={pago.id}>
                    <td>{new Date(pago.fechaPago).toLocaleDateString('es-MX')}</td>
                    <td>{pago.concepto}</td>
                    <td><em>{pago.beneficiario}</em></td>
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
const SolicitudesTab = ({ solicitudes, setSolicitudes, proyecto }) => {
  const handleAprobar = (solicitudId) => {
    setSolicitudes(prev => prev.map(s => 
      s.id === solicitudId ? { ...s, estado: 'aprobada' } : s
    ))
  }

  const handleRechazar = (solicitudId) => {
    setSolicitudes(prev => prev.map(s => 
      s.id === solicitudId ? { ...s, estado: 'rechazada' } : s
    ))
  }

  const getEstadoBadgeClass = (estado) => {
    switch(estado) {
      case 'pendiente': return 'badge-gray'
      case 'aprobada': return 'badge-beige'
      case 'completada': return 'badge-black'
      case 'rechazada': return 'badge-white'
      default: return 'badge-gray'
    }
  }

  const getPrioridadBadgeClass = (prioridad) => {
    switch(prioridad) {
      case 'alta': return 'badge-black'
      case 'media': return 'badge-beige'
      case 'baja': return 'badge-gray'
      default: return 'badge-gray'
    }
  }

  return (
    <div className="solicitudes-container">
      <div className="card">
        <h3>Solicitudes del Proyecto</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Prioridad</th>
                <th>Solicitante</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray)' }}>
                    No hay solicitudes para este proyecto
                  </td>
                </tr>
              ) : (
                solicitudes.map(sol => (
                  <tr key={sol.id}>
                    <td>{new Date(sol.fechaSolicitud).toLocaleDateString('es-MX')}</td>
                    <td><code>{sol.tipo}</code></td>
                    <td>{sol.descripcion}</td>
                    <td><code>{sol.cantidad} {sol.unidad}</code></td>
                    <td>
                      <span className={`badge ${getPrioridadBadgeClass(sol.prioridad)}`}>
                        {sol.prioridad}
                      </span>
                    </td>
                    <td><em>{sol.solicitante}</em></td>
                    <td>
                      <span className={`badge ${getEstadoBadgeClass(sol.estado)}`}>
                        {sol.estado}
                      </span>
                    </td>
                    <td>
                      {sol.estado === 'pendiente' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn-mini btn-approve"
                            onClick={() => handleAprobar(sol.id)}
                          >
                            ✓
                          </button>
                          <button 
                            className="btn-mini btn-reject"
                            onClick={() => handleRechazar(sol.id)}
                          >
                            ✕
                          </button>
                        </div>
                      )}
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

// ==================== ANALISIS TAB ====================
const AnalisisTab = ({ proyecto, pagos, movimientos }) => {
  const presupuesto = proyecto.presupuesto || 0
  const totalGastado = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0)
  const varianza = presupuesto - totalGastado
  const porcentajeVarianza = presupuesto > 0 ? (varianza / presupuesto) * 100 : 0

  // Análisis temporal
  const gastosPorMes = movimientos
    .filter(m => m.tipo === 'egreso')
    .reduce((acc, mov) => {
      const mes = new Date(mov.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short' })
      acc[mes] = (acc[mes] || 0) + mov.monto
      return acc
    }, {})

  return (
    <div className="analisis-container">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Presupuesto Original</div>
          <div className="stat-value">${presupuesto.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Ejecutado</div>
          <div className="stat-value">${totalGastado.toLocaleString('es-MX')}</div>
        </div>
        <div className={`stat-card ${varianza >= 0 ? 'stat-card-highlight' : ''}`}>
          <div className="label">Varianza</div>
          <div className="stat-value" style={{ color: varianza >= 0 ? '#000' : '#000' }}>
            ${varianza.toLocaleString('es-MX')}
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {porcentajeVarianza >= 0 ? '↓' : '↑'} {Math.abs(porcentajeVarianza).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Indicadores de Desempeño</h3>
        <div className="kpi-grid">
          <div className="kpi-item">
            <div className="kpi-label">Eficiencia Presupuestal</div>
            <div className="kpi-value">
              {presupuesto > 0 ? ((totalGastado / presupuesto) * 100).toFixed(1) : 0}%
            </div>
            <div className="kpi-desc">Del presupuesto utilizado</div>
          </div>
          <div className="kpi-item">
            <div className="kpi-label">Avance vs Gasto</div>
            <div className="kpi-value">
              {proyecto.progreso && presupuesto > 0 
                ? ((proyecto.progreso / ((totalGastado / presupuesto) * 100)) * 100).toFixed(0)
                : 0}%
            </div>
            <div className="kpi-desc">Proporción avance/gasto</div>
          </div>
          <div className="kpi-item">
            <div className="kpi-label">Proyección Final</div>
            <div className="kpi-value">
              ${proyecto.progreso > 0 
                ? ((totalGastado / proyecto.progreso) * 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })
                : 0}
            </div>
            <div className="kpi-desc">Costo estimado al 100%</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Gastos por Mes</h3>
        <div className="timeline-gastos">
          {Object.entries(gastosPorMes).map(([mes, monto]) => {
            const maxMonto = Math.max(...Object.values(gastosPorMes))
            const altura = (monto / maxMonto) * 100
            return (
              <div key={mes} className="timeline-item">
                <div className="timeline-bar" style={{ height: `${altura}%` }}>
                  <div className="timeline-tooltip">
                    ${monto.toLocaleString('es-MX')}
                  </div>
                </div>
                <div className="timeline-label">{mes}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ProyectoDetalle

