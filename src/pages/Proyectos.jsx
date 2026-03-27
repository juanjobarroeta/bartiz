import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Proyectos.css'
import { api } from '../config/api'

const Proyectos = () => {
  const navigate = useNavigate()
  const [proyectos, setProyectos] = useState([])
  const [presupuestos, setPresupuestos] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevoProyecto, setNuevoProyecto] = useState({
    nombre: '',
    cliente: '',
    ubicacion: '',
    presupuesto: '',
    fechaInicio: '',
    estado: 'Cotización'
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const [proyectosRes, presupuestosRes] = await Promise.all([
        fetch(api('/api/proyectos')),
        fetch(api('/api/presupuestos-proyecto'))
      ])
      
      setProyectos(await proyectosRes.json())
      setPresupuestos(await presupuestosRes.json())
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const tienePresupuesto = (proyectoId) => {
    return presupuestos.some(p => p.proyectoId === proyectoId)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const proyecto = {
      ...nuevoProyecto,
      presupuesto: parseFloat(nuevoProyecto.presupuesto) || 0
    }

    try {
      const res = await fetch(api('/api/proyectos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proyecto)
      })

      if (res.ok) {
        const nuevoProyectoCreado = await res.json()
        setProyectos([...proyectos, nuevoProyectoCreado])
        setNuevoProyecto({
          nombre: '',
          cliente: '',
          ubicacion: '',
          presupuesto: '',
          fechaInicio: '',
          estado: 'Cotización'
        })
        setMostrarFormulario(false)
        
        // Ask if user wants to create detailed budget
        if (window.confirm('¿Deseas crear el presupuesto detallado ahora?')) {
          navigate(`/presupuestos?crear=${nuevoProyectoCreado.id}`)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear el proyecto')
    }
  }

  const handleChange = (e) => {
    setNuevoProyecto({
      ...nuevoProyecto,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="proyectos">
      <div className="page-header">
        <div>
          <h1>Proyectos</h1>
          <div className="subtitle">Gestión de proyectos de construcción</div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Proyecto'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="card form-card">
          <h3>Crear Nuevo Proyecto</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label className="label">Nombre del Proyecto</label>
                <input
                  type="text"
                  name="nombre"
                  className="input"
                  value={nuevoProyecto.nombre}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Cliente</label>
                <input
                  type="text"
                  name="cliente"
                  className="input"
                  value={nuevoProyecto.cliente}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Ubicación</label>
                <input
                  type="text"
                  name="ubicacion"
                  className="input"
                  value={nuevoProyecto.ubicacion}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Presupuesto Estimado ($)</label>
                <input
                  type="number"
                  name="presupuesto"
                  className="input"
                  value={nuevoProyecto.presupuesto}
                  onChange={handleChange}
                  placeholder="Opcional - valor estimado"
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Podrás crear el presupuesto detallado después
                </small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Fecha de Inicio (Opcional)</label>
                <input
                  type="date"
                  name="fechaInicio"
                  className="input"
                  value={nuevoProyecto.fechaInicio}
                  onChange={handleChange}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Deja vacío si aún no está definida
                </small>
              </div>
              <div className="form-group">
                <label className="label">Estado</label>
                <select
                  name="estado"
                  className="input"
                  value={nuevoProyecto.estado}
                  onChange={handleChange}
                >
                  <option value="Cotización">Cotización</option>
                  <option value="Proceso de Licitación">Proceso de Licitación</option>
                  <option value="Planeación">Planeación</option>
                  <option value="En Progreso">En Progreso</option>
                  <option value="Pausado">Pausado</option>
                  <option value="Completado">Completado</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              Crear Proyecto
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Proyecto</th>
              <th>Cliente</th>
              <th>Ubicación</th>
              <th>Presupuesto Est.</th>
              <th>Fecha Inicio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proyectos.map(proyecto => (
              <tr key={proyecto.id}>
                <td 
                  onClick={() => navigate(`/proyectos/${proyecto.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <strong>{proyecto.nombre}</strong>
                </td>
                <td>{proyecto.cliente}</td>
                <td>{proyecto.ubicacion}</td>
                <td>${proyecto.presupuesto?.toLocaleString('es-MX') || '0'}</td>
                <td>
                  {proyecto.fechaInicio 
                    ? new Date(proyecto.fechaInicio).toLocaleDateString('es-MX')
                    : <span style={{ color: '#999', fontStyle: 'italic' }}>Por definir</span>
                  }
                </td>
                <td>
                  <code className={`status-badge status-${proyecto.estado.toLowerCase().replace(' ', '-')}`}>
                    {proyecto.estado}
                  </code>
                </td>
                <td>
                  {tienePresupuesto(proyecto.id) ? (
                    <button 
                      className="btn btn-sm"
                      onClick={() => navigate(`/presupuesto/${proyecto.id}`)}
                      style={{ fontSize: '13px' }}
                    >
                      📊 Ver Presupuesto
                    </button>
                  ) : (
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/presupuestos?crear=${proyecto.id}`)}
                      style={{ fontSize: '13px' }}
                    >
                      + Crear Presupuesto
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Proyectos

