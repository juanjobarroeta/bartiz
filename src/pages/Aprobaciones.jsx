import { useState, useEffect } from 'react'
import './Shared.css'
import './Dashboard.css'
import { api } from '../config/api'

const Aprobaciones = () => {
  const [solicitudes, setSolicitudes] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('pendiente')
  const [filtroProyecto, setFiltroProyecto] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [solicitudActual, setSolicitudActual] = useState(null)
  const [comentario, setComentario] = useState('')

  useEffect(() => {
    // Cargar proyectos
    fetch(api('/api/proyectos'))
      .then(res => res.json())
      .then(data => setProyectos(data))
      .catch(() => setProyectos([]))

    // Cargar solicitudes
    fetch(api('/api/solicitudes'))
      .then(res => res.json())
      .then(data => setSolicitudes(data))
      .catch(() => setSolicitudes([]))
  }, [])

  const handleAprobar = (solicitud) => {
    setSolicitudActual(solicitud)
    setMostrarModal(true)
  }

  const confirmarAprobacion = () => {
    if (solicitudActual) {
      setSolicitudes(prev => prev.map(s => 
        s.id === solicitudActual.id 
          ? { 
              ...s, 
              estado: 'aprobada',
              fechaAprobacion: new Date().toISOString(),
              aprobadoPor: 'Admin',
              comentarioAprobacion: comentario
            } 
          : s
      ))
      setMostrarModal(false)
      setComentario('')
      setSolicitudActual(null)
    }
  }

  const handleRechazar = (solicitud) => {
    const motivo = prompt('¿Motivo del rechazo?')
    if (motivo) {
      setSolicitudes(prev => prev.map(s => 
        s.id === solicitud.id 
          ? { 
              ...s, 
              estado: 'rechazada',
              fechaRechazo: new Date().toISOString(),
              rechazadoPor: 'Admin',
              motivoRechazo: motivo
            } 
          : s
      ))
    }
  }

  // Filtrar solicitudes
  const solicitudesFiltradas = solicitudes.filter(s => {
    if (filtroEstado && s.estado !== filtroEstado) return false
    if (filtroProyecto && s.proyecto !== filtroProyecto) return false
    if (filtroPrioridad && s.prioridad !== filtroPrioridad) return false
    return true
  })

  // Calcular estadísticas
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length
  const aprobadas = solicitudes.filter(s => s.estado === 'aprobada').length
  const rechazadas = solicitudes.filter(s => s.estado === 'rechazada').length
  const totalMontoPendiente = solicitudes
    .filter(s => s.estado === 'pendiente')
    .reduce((sum, s) => sum + (s.montoEstimado || 0), 0)

  const getEstadoBadgeClass = (estado) => {
    switch(estado) {
      case 'pendiente': return 'badge-beige'
      case 'aprobada': return 'badge-black'
      case 'rechazada': return 'badge-white'
      case 'completada': return 'badge-gray'
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

  // Función para estimar presupuesto del proyecto
  const getPresupuestoDisponible = (nombreProyecto) => {
    const proyecto = proyectos.find(p => p.nombre === nombreProyecto)
    if (!proyecto) return null
    
    // Calcular gastos ya aprobados
    const gastosAprobados = solicitudes
      .filter(s => s.proyecto === nombreProyecto && s.estado === 'aprobada')
      .reduce((sum, s) => sum + (s.montoEstimado || 0), 0)
    
    const disponible = (proyecto.presupuesto || 0) - gastosAprobados
    const porcentaje = proyecto.presupuesto > 0 ? (disponible / proyecto.presupuesto) * 100 : 0
    
    return {
      presupuesto: proyecto.presupuesto || 0,
      gastado: gastosAprobados,
      disponible: disponible,
      porcentaje: porcentaje
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Centro de Aprobaciones</h1>
          <div className="subtitle">Revisión y aprobación de solicitudes de compra</div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card stat-card-highlight">
          <div className="label">Pendientes de Aprobar</div>
          <div className="stat-value">{pendientes}</div>
        </div>
        <div className="stat-card">
          <div className="label">Aprobadas</div>
          <div className="stat-value">{aprobadas}</div>
        </div>
        <div className="stat-card">
          <div className="label">Rechazadas</div>
          <div className="stat-value">{rechazadas}</div>
        </div>
        <div className="stat-card">
          <div className="label">Monto Pendiente</div>
          <div className="stat-value">${totalMontoPendiente.toLocaleString('es-MX')}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Filtros</h3>
        <div className="form-row" style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label className="label">Estado</label>
            <select
              className="input"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="aprobada">Aprobadas</option>
              <option value="rechazada">Rechazadas</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Proyecto</label>
            <select
              className="input"
              value={filtroProyecto}
              onChange={(e) => setFiltroProyecto(e.target.value)}
            >
              <option value="">Todos los proyectos</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.nombre}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Prioridad</label>
            <select
              className="input"
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Solicitudes */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proyecto</th>
              <th>Descripción</th>
              <th>Proveedor</th>
              <th>Cantidad</th>
              <th>Monto Est.</th>
              <th>Prioridad</th>
              <th>Solicitante</th>
              <th>Presupuesto</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudesFiltradas.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray)' }}>
                  No hay solicitudes que mostrar
                </td>
              </tr>
            ) : (
              solicitudesFiltradas.map(sol => {
                const presupuestoInfo = getPresupuestoDisponible(sol.proyecto)
                const alertaPresupuesto = presupuestoInfo && presupuestoInfo.porcentaje < 10
                
                return (
                  <tr key={sol.id} style={{ backgroundColor: alertaPresupuesto ? '#FEF3C7' : 'transparent' }}>
                    <td>{new Date(sol.fechaSolicitud).toLocaleDateString('es-MX')}</td>
                    <td><strong>{sol.proyecto}</strong></td>
                    <td>{sol.descripcion}</td>
                    <td><em>{sol.proveedorNombre || '—'}</em></td>
                    <td><code>{sol.cantidad} {sol.unidad}</code></td>
                    <td>
                      <strong>
                        ${(sol.montoEstimado || 0).toLocaleString('es-MX')}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge ${getPrioridadBadgeClass(sol.prioridad)}`}>
                        {sol.prioridad}
                      </span>
                    </td>
                    <td>{sol.solicitante}</td>
                    <td>
                      {presupuestoInfo ? (
                        <div style={{ fontSize: '0.75rem' }}>
                          <div style={{ color: alertaPresupuesto ? '#B45309' : 'var(--color-text-light)' }}>
                            Disp: ${presupuestoInfo.disponible.toLocaleString('es-MX')}
                          </div>
                          <div style={{ color: alertaPresupuesto ? '#B45309' : 'var(--color-text-light)' }}>
                            {presupuestoInfo.porcentaje.toFixed(0)}%
                          </div>
                        </div>
                      ) : '—'}
                    </td>
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
                            onClick={() => handleAprobar(sol)}
                            title="Aprobar"
                          >
                            ✓
                          </button>
                          <button 
                            className="btn-mini btn-reject"
                            onClick={() => handleRechazar(sol)}
                            title="Rechazar"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      {sol.estado === 'aprobada' && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                          ✓ Aprobada
                        </span>
                      )}
                      {sol.estado === 'rechazada' && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                          ✕ Rechazada
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Confirmación */}
      {mostrarModal && solicitudActual && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Aprobar Solicitud</h3>
            <div style={{ margin: '1.5rem 0' }}>
              <p><strong>Proyecto:</strong> {solicitudActual.proyecto}</p>
              <p><strong>Descripción:</strong> {solicitudActual.descripcion}</p>
              <p><strong>Cantidad:</strong> {solicitudActual.cantidad} {solicitudActual.unidad}</p>
              <p><strong>Proveedor:</strong> {solicitudActual.proveedorNombre || 'No asignado'}</p>
              <p><strong>Monto Estimado:</strong> ${(solicitudActual.montoEstimado || 0).toLocaleString('es-MX')}</p>
            </div>
            <div className="form-group">
              <label className="label">Comentarios (Opcional)</label>
              <textarea
                className="input"
                rows="3"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Agregar notas sobre la aprobación..."
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-primary"
                onClick={confirmarAprobacion}
              >
                Confirmar Aprobación
              </button>
              <button 
                className="btn"
                onClick={() => setMostrarModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Aprobaciones




