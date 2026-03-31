import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import './Presupuestos.css'
import { api } from '../config/api'

const Cotizaciones = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [cotizaciones, setCotizaciones] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [presupuestos, setPresupuestos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarCrear, setMostrarCrear] = useState(false)
  const [nuevaCotizacion, setNuevaCotizacion] = useState({
    presupuestoId: '',
    nombreCotizacion: '',
    clienteNombre: '',
    tipoCliente: 'privado',
    margenGlobal: 20,
    incluirIva: true
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    // Check if we should auto-open the create modal
    const presupuestoParam = searchParams.get('presupuesto')
    if (presupuestoParam) {
      setNuevaCotizacion({...nuevaCotizacion, presupuestoId: presupuestoParam})
      setMostrarCrear(true)
    }
  }, [searchParams])

  const cargarDatos = async () => {
    try {
      const [cotizacionesRes, proyectosRes, presupuestosRes] = await Promise.all([
        fetch(api('/api/cotizaciones')),
        fetch(api('/api/proyectos')),
        fetch(api('/api/presupuestos-proyecto'))
      ])
      
      setCotizaciones(await cotizacionesRes.json())
      setProyectos(await proyectosRes.json())
      setPresupuestos(await presupuestosRes.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const crearCotizacion = async () => {
    if (!nuevaCotizacion.presupuestoId || !nuevaCotizacion.nombreCotizacion) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    try {
      const res = await fetch(api('/api/cotizaciones/desde-presupuesto'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaCotizacion)
      })

      if (res.ok) {
        const nueva = await res.json()
        navigate(`/cotizacion/${nueva.id}`)
      } else {
        const error = await res.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear cotización')
    }
  }

  const getProyectoNombre = (presupuestoId) => {
    const presupuesto = presupuestos.find(p => p.id === presupuestoId)
    return presupuesto?.proyectoNombre || 'Proyecto'
  }

  if (loading) {
    return <div className="loading">Cargando cotizaciones...</div>
  }

  return (
    <div className="presupuestos-page">
      <header className="page-header-bar">
        <div>
          <h1>Cotizaciones</h1>
          <p className="subtitle">Genera propuestas de precios para clientes con márgenes personalizados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setMostrarCrear(true)}>
          + Nueva Cotización
        </button>
      </header>

      {/* Stats */}
      <div className="presupuestos-stats">
        <div className="stat">
          <span className="stat-value">{cotizaciones.length}</span>
          <span className="stat-label">Cotizaciones Totales</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {cotizaciones.filter(c => c.estado === 'enviada').length}
          </span>
          <span className="stat-label">Enviadas</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {cotizaciones.filter(c => c.estado === 'aceptada').length}
          </span>
          <span className="stat-label">Aceptadas</span>
        </div>
        <div className="stat highlight">
          <span className="stat-value">
            ${cotizaciones
              .filter(c => c.estado === 'aceptada')
              .reduce((sum, c) => sum + (c.resumen?.totalVenta || 0), 0)
              .toLocaleString()}
          </span>
          <span className="stat-label">Valor Ganado</span>
        </div>
      </div>

      {/* Quotes Grid */}
      <div className="presupuestos-grid">
        {cotizaciones.map(cotizacion => {
          const margenGlobal = cotizacion.margenGlobal || 20
          
          return (
            <Link 
              to={`/cotizacion/${cotizacion.id}`} 
              key={cotizacion.id} 
              className="presupuesto-card"
            >
              <div className="presupuesto-header">
                <h3>{cotizacion.nombreCotizacion}</h3>
                <span className={`estado-badge ${cotizacion.estado}`}>
                  {cotizacion.estado}
                </span>
              </div>
              
              <div className="presupuesto-meta">
                <span>📋 {getProyectoNombre(cotizacion.presupuestoId)}</span>
              </div>
              
              <div className="presupuesto-meta">
                <span>👤 {cotizacion.clienteNombre || 'Cliente por definir'}</span>
                <span className="sep">•</span>
                <span>📊 Margen: {margenGlobal}%</span>
              </div>

              <div className="presupuesto-financials">
                <div className="financial-row">
                  <span className="financial-label">Costo</span>
                  <span className="financial-value" style={{ color: '#ef4444' }}>
                    ${cotizacion.resumen?.totalCosto?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="financial-row">
                  <span className="financial-label">Venta</span>
                  <span className="financial-value" style={{ color: '#10b981' }}>
                    ${cotizacion.resumen?.totalVenta?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="financial-row">
                  <span className="financial-label">Utilidad</span>
                  <span className="financial-value" style={{ fontWeight: 'bold' }}>
                    ${cotizacion.resumen?.utilidad?.toLocaleString() || 0}
                  </span>
                </div>
              </div>

              <div className="presupuesto-footer">
                <span className="fecha">
                  Creada: {new Date(cotizacion.fechaCreacion).toLocaleDateString('es-MX')}
                </span>
                <span className="ver-mas">Ver detalles →</span>
              </div>
            </Link>
          )
        })}

        {/* Add New Card */}
        {presupuestos.length > 0 && (
          <div className="presupuesto-card add-card" onClick={() => setMostrarCrear(true)}>
            <div className="add-icon">+</div>
            <span>Crear Cotización</span>
            <span className="add-subtitle">Genera propuesta para cliente</span>
          </div>
        )}
      </div>

      {cotizaciones.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <h3>No hay cotizaciones creadas</h3>
          <p>Crea una cotización para proponer precios a un cliente basada en tu presupuesto de costos</p>
          <button className="btn btn-primary" onClick={() => setMostrarCrear(true)}>
            + Crear Primera Cotización
          </button>
        </div>
      )}

      {/* Create Modal */}
      {mostrarCrear && (
        <div className="modal-overlay" onClick={() => setMostrarCrear(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva Cotización</h2>
              <button className="modal-close" onClick={() => setMostrarCrear(false)}>✕</button>
            </div>
            <div className="modal-content">
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                La cotización toma los costos del presupuesto y aplica un <strong>margen de ganancia</strong> 
                para generar los precios que cobrarás al cliente.
              </p>
              
              <div className="form-group">
                <label className="label">Presupuesto Base *</label>
                <select
                  className="input"
                  value={nuevaCotizacion.presupuestoId}
                  onChange={(e) => setNuevaCotizacion({...nuevaCotizacion, presupuestoId: e.target.value})}
                >
                  <option value="">Seleccionar presupuesto...</option>
                  {presupuestos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.proyectoNombre} - Costo: ${p.resumen?.totalCosto?.toLocaleString() || 0}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Nombre de la Cotización *</label>
                <input
                  type="text"
                  className="input"
                  value={nuevaCotizacion.nombreCotizacion}
                  onChange={(e) => setNuevaCotizacion({...nuevaCotizacion, nombreCotizacion: e.target.value})}
                  placeholder="Ej: Propuesta Cliente ABC - v1"
                />
              </div>

              <div className="form-group">
                <label className="label">Nombre del Cliente</label>
                <input
                  type="text"
                  className="input"
                  value={nuevaCotizacion.clienteNombre}
                  onChange={(e) => setNuevaCotizacion({...nuevaCotizacion, clienteNombre: e.target.value})}
                  placeholder="Opcional"
                />
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="label">Tipo de Cliente</label>
                  <select
                    className="input"
                    value={nuevaCotizacion.tipoCliente}
                    onChange={(e) => setNuevaCotizacion({...nuevaCotizacion, tipoCliente: e.target.value})}
                  >
                    <option value="privado">Privado</option>
                    <option value="gobierno">Gobierno</option>
                    <option value="corporativo">Corporativo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Margen de Ganancia (%) *</label>
                  <input
                    type="number"
                    className="input"
                    value={nuevaCotizacion.margenGlobal}
                    onChange={(e) => setNuevaCotizacion({...nuevaCotizacion, margenGlobal: parseFloat(e.target.value) || 0})}
                    placeholder="20"
                    step="0.5"
                    min="0"
                    max="100"
                  />
                  <small style={{ color: '#666', fontSize: '11px', marginTop: '5px', display: 'block' }}>
                    Típico: Gobierno 10-15%, Privado 20-30%
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={nuevaCotizacion.incluirIva}
                    onChange={(e) => setNuevaCotizacion({...nuevaCotizacion, incluirIva: e.target.checked})}
                  />
                  <span>Incluir IVA (16%) en PDF</span>
                </label>
              </div>

              {presupuestos.length === 0 && (
                <p className="warning-text" style={{ color: '#ef4444', fontSize: '13px' }}>
                  No hay presupuestos disponibles. Crea un presupuesto primero.
                </p>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setMostrarCrear(false)}>Cancelar</button>
              <button 
                className="btn btn-primary" 
                onClick={crearCotizacion}
                disabled={!nuevaCotizacion.presupuestoId || !nuevaCotizacion.nombreCotizacion}
              >
                Crear Cotización
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Cotizaciones
