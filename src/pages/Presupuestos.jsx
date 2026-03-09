import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import './Presupuestos.css'
import { api } from '../config/api'

const Presupuestos = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [presupuestos, setPresupuestos] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarCrear, setMostrarCrear] = useState(false)
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    // Check if we should auto-open the create modal
    const crearParam = searchParams.get('crear')
    if (crearParam) {
      setProyectoSeleccionado(crearParam)
      setMostrarCrear(true)
    }
  }, [searchParams])

  const cargarDatos = async () => {
    try {
      const [presupuestosRes, proyectosRes] = await Promise.all([
        fetch(api('/api/presupuestos-proyecto')),
        fetch(api('/api/proyectos'))
      ])
      
      setPresupuestos(await presupuestosRes.json())
      setProyectos(await proyectosRes.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const crearPresupuesto = async () => {
    if (!proyectoSeleccionado) return

    const proyecto = proyectos.find(p => p.id === parseInt(proyectoSeleccionado))
    
    try {
      const res = await fetch('/api/presupuestos-proyecto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyectoId: parseInt(proyectoSeleccionado),
          proyectoNombre: proyecto?.nombre || 'Proyecto',
          fases: []
        })
      })

      if (res.ok) {
        const nuevo = await res.json()
        navigate(`/presupuesto/${proyectoSeleccionado}`)
      } else {
        const error = await res.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Get projects without budget
  const proyectosSinPresupuesto = proyectos.filter(
    p => !presupuestos.some(pr => pr.proyectoId === p.id)
  )

  const calcularProgreso = (presupuesto) => {
    const { totalPresupuestado, totalPagado } = presupuesto.resumen || {}
    if (!totalPresupuestado) return 0
    return Math.round((totalPagado / totalPresupuestado) * 100)
  }

  if (loading) {
    return <div className="loading">Cargando presupuestos...</div>
  }

  return (
    <div className="presupuestos-page">
      <header className="page-header-bar">
        <div>
          <h1>Presupuestos de Proyecto</h1>
          <p className="subtitle">Gestiona presupuestos y genera solicitudes de compra</p>
        </div>
        <button className="btn btn-primary" onClick={() => setMostrarCrear(true)}>
          + Nuevo Presupuesto
        </button>
      </header>

      {/* Stats */}
      <div className="presupuestos-stats">
        <div className="stat">
          <span className="stat-value">{presupuestos.length}</span>
          <span className="stat-label">Presupuestos Activos</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            ${presupuestos.reduce((sum, p) => sum + (p.resumen?.totalPresupuestado || 0), 0).toLocaleString()}
          </span>
          <span className="stat-label">Total Presupuestado</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            ${presupuestos.reduce((sum, p) => sum + (p.resumen?.totalGastoReal || 0), 0).toLocaleString()}
          </span>
          <span className="stat-label">Gasto Real</span>
        </div>
        <div className="stat highlight">
          <span className="stat-value">
            ${presupuestos.reduce((sum, p) => sum + (p.resumen?.totalPagado || 0), 0).toLocaleString()}
          </span>
          <span className="stat-label">Total Pagado</span>
        </div>
      </div>

      {/* Budgets Grid */}
      <div className="presupuestos-grid">
        {presupuestos.map(presupuesto => {
          const progreso = calcularProgreso(presupuesto)
          const totalFases = presupuesto.fases.length
          const totalItems = presupuesto.fases.reduce((sum, f) => sum + f.items.length, 0)
          
          return (
            <Link 
              to={`/presupuesto/${presupuesto.proyectoId}`} 
              key={presupuesto.id} 
              className="presupuesto-card"
            >
              <div className="presupuesto-header">
                <h3>{presupuesto.proyectoNombre}</h3>
                <span className={`estado-badge ${presupuesto.estado}`}>
                  {presupuesto.estado === 'activo' ? 'Activo' : presupuesto.estado}
                </span>
              </div>
              
              <div className="presupuesto-meta">
                <span>{totalFases} fases</span>
                <span className="sep">•</span>
                <span>{totalItems} items</span>
              </div>

              <div className="presupuesto-financials">
                <div className="financial-row">
                  <span className="financial-label">Presupuestado</span>
                  <span className="financial-value">${presupuesto.resumen?.totalPresupuestado?.toLocaleString() || 0}</span>
                </div>
                <div className="financial-row">
                  <span className="financial-label">Gasto Real</span>
                  <span className="financial-value">${presupuesto.resumen?.totalGastoReal?.toLocaleString() || 0}</span>
                </div>
              </div>

              <div className="presupuesto-progress">
                <div className="progress-header">
                  <span>Pagado</span>
                  <span>{progreso}%</span>
                </div>
                <div className="progress-bar-sm">
                  <div className="progress-fill-sm" style={{ width: `${progreso}%` }} />
                </div>
              </div>

              <div className="presupuesto-footer">
                <span className="fecha">Actualizado: {presupuesto.fechaActualizacion}</span>
                <span className="ver-mas">Ver detalles →</span>
              </div>
            </Link>
          )
        })}

        {/* Add New Card */}
        {proyectosSinPresupuesto.length > 0 && (
          <div className="presupuesto-card add-card" onClick={() => setMostrarCrear(true)}>
            <div className="add-icon">+</div>
            <span>Crear Presupuesto</span>
            <span className="add-subtitle">{proyectosSinPresupuesto.length} proyectos sin presupuesto</span>
          </div>
        )}
      </div>

      {presupuestos.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No hay presupuestos creados</h3>
          <p>Crea un presupuesto para comenzar a planificar las compras de un proyecto</p>
          <button className="btn btn-primary" onClick={() => setMostrarCrear(true)}>
            + Crear Primer Presupuesto
          </button>
        </div>
      )}

      {/* Create Modal */}
      {mostrarCrear && (
        <div className="modal-overlay" onClick={() => setMostrarCrear(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Presupuesto</h2>
              <button className="modal-close" onClick={() => setMostrarCrear(false)}>✕</button>
            </div>
            <div className="modal-content">
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                El presupuesto detallado te permite desglosar el proyecto en <strong>fases</strong> 
                (Preliminares, Estructura, Acabados, etc.) y agregar <strong>artículos específicos</strong> 
                con cantidades y precios.
              </p>
              
              <div className="form-group">
                <label className="label">Proyecto *</label>
                <select
                  className="input"
                  value={proyectoSeleccionado}
                  onChange={(e) => setProyectoSeleccionado(e.target.value)}
                >
                  <option value="">Seleccionar proyecto...</option>
                  {proyectosSinPresupuesto.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              {proyectosSinPresupuesto.length === 0 && (
                <p className="warning-text">
                  Todos los proyectos ya tienen presupuesto asignado.
                </p>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setMostrarCrear(false)}>Cancelar</button>
              <button 
                className="btn btn-primary" 
                onClick={crearPresupuesto}
                disabled={!proyectoSeleccionado}
              >
                Crear Presupuesto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Presupuestos
