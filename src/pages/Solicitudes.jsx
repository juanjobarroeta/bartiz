import { useState, useEffect } from 'react'
import './Shared.css'
import { api } from '../config/api'

const Solicitudes = () => {
  const [solicitudes, setSolicitudes] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevaSolicitud, setNuevaSolicitud] = useState({
    proyecto: '',
    tipo: 'material',
    descripcion: '',
    cantidad: '',
    unidad: '',
    montoEstimado: '',
    prioridad: 'media',
    solicitante: '',
    proveedorId: '',
    proveedorNombre: '',
    fechaSolicitud: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    // Cargar proyectos
    fetch(api('/api/proyectos'))
      .then(res => res.json())
      .then(data => setProyectos(data))
      .catch(() => setProyectos([]))

    // Cargar proveedores
    fetch(api('/api/proveedores'))
      .then(res => res.json())
      .then(data => setProveedores(data))
      .catch(() => setProveedores([]))

    // Cargar solicitudes
    fetch(api('/api/solicitudes'))
      .then(res => res.json())
      .then(data => setSolicitudes(data))
      .catch(() => {
        setSolicitudes([
          { 
            id: 1, 
            proyecto: 'Torre Corporativa Centro', 
            tipo: 'material', 
            descripcion: 'Cemento Portland Gris', 
            cantidad: 150, 
            unidad: 'Bultos',
            prioridad: 'alta',
            solicitante: 'Ing. Pedro Ruiz',
            fechaSolicitud: '2024-11-20',
            estado: 'pendiente'
          },
          { 
            id: 2, 
            proyecto: 'Plaza Comercial Zona Norte', 
            tipo: 'equipo', 
            descripcion: 'Renta de Excavadora', 
            cantidad: 1, 
            unidad: 'Unidad',
            prioridad: 'alta',
            solicitante: 'Arq. Laura Vega',
            fechaSolicitud: '2024-11-21',
            estado: 'aprobada'
          },
          { 
            id: 3, 
            proyecto: 'Residencial Los Pinos', 
            tipo: 'material', 
            descripcion: 'Varilla corrugada 3/8"', 
            cantidad: 2500, 
            unidad: 'kg',
            prioridad: 'media',
            solicitante: 'Ing. Carlos Mora',
            fechaSolicitud: '2024-11-22',
            estado: 'pendiente'
          },
          { 
            id: 4, 
            proyecto: 'Nave Industrial Parque Tech', 
            tipo: 'servicio', 
            descripcion: 'Estudio de mecánica de suelos', 
            cantidad: 1, 
            unidad: 'Servicio',
            prioridad: 'alta',
            solicitante: 'Ing. Sandra López',
            fechaSolicitud: '2024-11-18',
            estado: 'completada'
          },
          { 
            id: 5, 
            proyecto: 'Ampliación Hospital Regional', 
            tipo: 'material', 
            descripcion: 'Block hueco 15x20x40', 
            cantidad: 5000, 
            unidad: 'Piezas',
            prioridad: 'media',
            solicitante: 'Mtro. Jorge Herrera',
            fechaSolicitud: '2024-11-23',
            estado: 'pendiente'
          }
        ])
      })
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const solicitud = {
      id: solicitudes.length + 1,
      ...nuevaSolicitud,
      cantidad: parseFloat(nuevaSolicitud.cantidad),
      montoEstimado: parseFloat(nuevaSolicitud.montoEstimado),
      estado: 'pendiente'
    }

    setSolicitudes([...solicitudes, solicitud])
    setNuevaSolicitud({
      proyecto: '',
      tipo: 'material',
      descripcion: '',
      cantidad: '',
      unidad: '',
      montoEstimado: '',
      prioridad: 'media',
      solicitante: '',
      proveedorId: '',
      proveedorNombre: '',
      fechaSolicitud: new Date().toISOString().split('T')[0]
    })
    setMostrarFormulario(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Si se selecciona un proveedor, auto-llenar el nombre
    if (name === 'proveedorId' && value) {
      const proveedor = proveedores.find(p => p.id === parseInt(value))
      if (proveedor) {
        setNuevaSolicitud({
          ...nuevaSolicitud,
          proveedorId: value,
          proveedorNombre: proveedor.nombre
        })
        return
      }
    }
    
    setNuevaSolicitud({
      ...nuevaSolicitud,
      [name]: value
    })
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

  const getTipoBadgeClass = (tipo) => {
    switch(tipo) {
      case 'material': return 'badge-gray'
      case 'equipo': return 'badge-beige'
      case 'servicio': return 'badge-white'
      default: return 'badge-gray'
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Solicitudes</h1>
          <div className="subtitle">Control de solicitudes y órdenes de compra</div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nueva Solicitud'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="card form-card">
          <h3>Crear Nueva Solicitud</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label className="label">Proyecto</label>
                <select
                  name="proyecto"
                  className="input"
                  value={nuevaSolicitud.proyecto}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar proyecto...</option>
                  <option value="Gastos Generales">💼 Gastos Generales</option>
                  <optgroup label="Proyectos Activos">
                    {proyectos
                      .filter(p => ['Cotización', 'Proceso de Licitación', 'Planeación', 'En Progreso'].includes(p.estado))
                      .map(proyecto => (
                        <option key={proyecto.id} value={proyecto.nombre}>
                          {proyecto.nombre}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Otros Proyectos">
                    {proyectos
                      .filter(p => !['Cotización', 'Proceso de Licitación', 'Planeación', 'En Progreso'].includes(p.estado))
                      .map(proyecto => (
                        <option key={proyecto.id} value={proyecto.nombre}>
                          {proyecto.nombre}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Tipo</label>
                <select
                  name="tipo"
                  className="input"
                  value={nuevaSolicitud.tipo}
                  onChange={handleChange}
                  required
                >
                  <option value="material">Material</option>
                  <option value="equipo">Equipo</option>
                  <option value="servicio">Servicio</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Descripción</label>
              <input
                type="text"
                name="descripcion"
                className="input"
                value={nuevaSolicitud.descripcion}
                onChange={handleChange}
                placeholder="Descripción detallada del item solicitado"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Cantidad</label>
                <input
                  type="number"
                  name="cantidad"
                  className="input"
                  value={nuevaSolicitud.cantidad}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Unidad</label>
                <input
                  type="text"
                  name="unidad"
                  className="input"
                  value={nuevaSolicitud.unidad}
                  onChange={handleChange}
                  placeholder="ej: Bultos, m³, Piezas"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Monto Estimado ($)</label>
              <input
                type="number"
                name="montoEstimado"
                className="input"
                value={nuevaSolicitud.montoEstimado}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Prioridad</label>
                <select
                  name="prioridad"
                  className="input"
                  value={nuevaSolicitud.prioridad}
                  onChange={handleChange}
                  required
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Solicitante</label>
                <input
                  type="text"
                  name="solicitante"
                  className="input"
                  value={nuevaSolicitud.solicitante}
                  onChange={handleChange}
                  placeholder="Nombre del solicitante"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Proveedor Sugerido (Opcional)</label>
              <select
                name="proveedorId"
                className="input"
                value={nuevaSolicitud.proveedorId}
                onChange={handleChange}
              >
                <option value="">Sin proveedor asignado</option>
                <optgroup label="Materiales">
                  {proveedores
                    .filter(p => p.categoria === 'materiales' && p.activo)
                    .map(proveedor => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre} - {proveedor.condicionesPago}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Equipos">
                  {proveedores
                    .filter(p => p.categoria === 'equipos' && p.activo)
                    .map(proveedor => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre} - {proveedor.condicionesPago}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Servicios">
                  {proveedores
                    .filter(p => p.categoria === 'servicios' && p.activo)
                    .map(proveedor => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre} - {proveedor.condicionesPago}
                      </option>
                    ))}
                </optgroup>
              </select>
              {nuevaSolicitud.proveedorNombre && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
                  Proveedor seleccionado: <strong>{nuevaSolicitud.proveedorNombre}</strong>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="label">Fecha de Solicitud</label>
              <input
                type="date"
                name="fechaSolicitud"
                className="input"
                value={nuevaSolicitud.fechaSolicitud}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Crear Solicitud
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Proyecto</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th>Prioridad</th>
              <th>Solicitante</th>
              <th>Proveedor</th>
              <th>Fecha</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map(solicitud => (
              <tr key={solicitud.id}>
                <td><strong>{solicitud.proyecto}</strong></td>
                <td>
                  <span className={`badge ${getTipoBadgeClass(solicitud.tipo)}`}>
                    {solicitud.tipo.charAt(0).toUpperCase() + solicitud.tipo.slice(1)}
                  </span>
                </td>
                <td>{solicitud.descripcion}</td>
                <td><code>{solicitud.cantidad} {solicitud.unidad}</code></td>
                <td>
                  <span className={`badge ${getPrioridadBadgeClass(solicitud.prioridad)}`}>
                    {solicitud.prioridad.charAt(0).toUpperCase() + solicitud.prioridad.slice(1)}
                  </span>
                </td>
                <td><em>{solicitud.solicitante}</em></td>
                <td>
                  {solicitud.proveedorNombre ? (
                    <span style={{ fontSize: '0.875rem' }}>{solicitud.proveedorNombre}</span>
                  ) : (
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-gray)' }}>—</span>
                  )}
                </td>
                <td>{new Date(solicitud.fechaSolicitud).toLocaleDateString('es-MX')}</td>
                <td>
                  <span className={`badge ${getEstadoBadgeClass(solicitud.estado)}`}>
                    {solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Solicitudes

