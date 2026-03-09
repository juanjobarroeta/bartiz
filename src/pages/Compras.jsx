import { useEffect, useState } from 'react'
import './Compras.css'
import { api } from '../config/api'

const Compras = () => {
  const [solicitudes, setSolicitudes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [filtroProveedor, setFiltroProveedor] = useState('')
  const [filtroProyecto, setFiltroProyecto] = useState('')
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  
  // View mode
  const [vistaActiva, setVistaActiva] = useState('proveedor') // proveedor, proyecto, articulo, detalle
  
  // Expanded groups
  const [gruposExpandidos, setGruposExpandidos] = useState(new Set())

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const [solicitudesRes, proveedoresRes, proyectosRes] = await Promise.all([
        fetch(api('/api/solicitudes-compra')),
        fetch(api('/api/proveedores')),
        fetch(api('/api/proyectos'))
      ])
      
      const solicitudesData = await solicitudesRes.json()
      // Filter to only show paid and received (completed purchases)
      const completadas = solicitudesData.filter(s => 
        ['pagado', 'recibido', 'ordenado', 'aprobado'].includes(s.estado?.toLowerCase())
      )
      setSolicitudes(completadas)
      setProveedores(await proveedoresRes.json())
      setProyectos(await proyectosRes.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  const solicitudesFiltradas = solicitudes.filter(s => {
    if (filtroProveedor && s.proveedorId !== parseInt(filtroProveedor)) return false
    if (filtroProyecto && s.proyectoId !== parseInt(filtroProyecto)) return false
    if (filtroFechaInicio && s.fechaCreacion < filtroFechaInicio) return false
    if (filtroFechaFin && s.fechaCreacion > filtroFechaFin) return false
    return true
  })

  // Calculate stats
  const totalGastado = solicitudesFiltradas.reduce((sum, s) => sum + (s.total || s.subtotalEstimado || 0), 0)
  const totalPagado = solicitudesFiltradas
    .filter(s => s.estado?.toLowerCase() === 'pagado')
    .reduce((sum, s) => sum + (s.total || s.subtotalEstimado || 0), 0)
  const proveedoresUnicos = new Set(solicitudesFiltradas.map(s => s.proveedorId)).size
  const proyectosUnicos = new Set(solicitudesFiltradas.map(s => s.proyectoId)).size
  
  // Get all items from all solicitudes
  const todosLosItems = solicitudesFiltradas.flatMap(s => 
    (s.items || []).map(item => ({
      ...item,
      proveedorId: s.proveedorId,
      proveedorNombre: s.proveedorNombre,
      proyectoId: s.proyectoId,
      proyectoNombre: s.proyectoNombre,
      fecha: s.fechaCreacion,
      folio: s.folio,
      estadoSolicitud: s.estado
    }))
  )

  // Group by proveedor
  const agrupadoPorProveedor = solicitudesFiltradas.reduce((acc, s) => {
    const key = s.proveedorNombre || 'Sin Proveedor'
    if (!acc[key]) {
      acc[key] = { nombre: key, id: s.proveedorId, solicitudes: [], total: 0, items: [] }
    }
    acc[key].solicitudes.push(s)
    acc[key].total += (s.total || s.subtotalEstimado || 0)
    acc[key].items.push(...(s.items || []).map(item => ({
      ...item,
      fecha: s.fechaCreacion,
      folio: s.folio,
      proyectoNombre: s.proyectoNombre
    })))
    return acc
  }, {})

  // Group by proyecto
  const agrupadoPorProyecto = solicitudesFiltradas.reduce((acc, s) => {
    const key = s.proyectoNombre || 'Sin Proyecto'
    if (!acc[key]) {
      acc[key] = { nombre: key, id: s.proyectoId, solicitudes: [], total: 0, items: [] }
    }
    acc[key].solicitudes.push(s)
    acc[key].total += (s.total || s.subtotalEstimado || 0)
    acc[key].items.push(...(s.items || []).map(item => ({
      ...item,
      fecha: s.fechaCreacion,
      folio: s.folio,
      proveedorNombre: s.proveedorNombre
    })))
    return acc
  }, {})

  // Group by articulo
  const agrupadoPorArticulo = todosLosItems.reduce((acc, item) => {
    const key = item.articuloNombre || item.nombre || 'Sin Nombre'
    if (!acc[key]) {
      acc[key] = { 
        nombre: key, 
        codigo: item.articuloCodigo || item.codigo,
        unidad: item.unidad,
        compras: [],
        totalCantidad: 0,
        totalGasto: 0,
        precioMin: Infinity,
        precioMax: 0,
        proveedores: new Set()
      }
    }
    const precio = item.precioUnitario || item.precioEstimado || 0
    const cantidad = item.cantidad || 0
    acc[key].compras.push(item)
    acc[key].totalCantidad += cantidad
    acc[key].totalGasto += cantidad * precio
    acc[key].precioMin = Math.min(acc[key].precioMin, precio || Infinity)
    acc[key].precioMax = Math.max(acc[key].precioMax, precio || 0)
    acc[key].proveedores.add(item.proveedorNombre)
    return acc
  }, {})

  const toggleGrupo = (key) => {
    const nuevos = new Set(gruposExpandidos)
    if (nuevos.has(key)) {
      nuevos.delete(key)
    } else {
      nuevos.add(key)
    }
    setGruposExpandidos(nuevos)
  }

  const limpiarFiltros = () => {
    setFiltroProveedor('')
    setFiltroProyecto('')
    setFiltroFechaInicio('')
    setFiltroFechaFin('')
  }

  const getEstadoBadge = (estado) => {
    const e = estado?.toLowerCase()
    switch(e) {
      case 'pagado': return 'badge-pagado'
      case 'recibido': return 'badge-recibido'
      case 'ordenado': return 'badge-ordenado'
      case 'aprobado': return 'badge-aprobado'
      default: return ''
    }
  }

  if (loading) {
    return <div className="loading">Cargando análisis de compras...</div>
  }

  return (
    <div className="compras-page">
      {/* Header */}
      <header className="page-header-bar">
        <div>
          <h1>Análisis de Compras</h1>
          <p className="subtitle">Historial detallado de compras por proveedor, proyecto y artículo</p>
        </div>
      </header>

      {/* Stats */}
      <div className="compras-stats">
        <div className="stat-card highlight">
          <span className="stat-icon">💰</span>
          <div className="stat-info">
            <span className="stat-value">${totalGastado.toLocaleString()}</span>
            <span className="stat-label">Total Compras</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-info">
            <span className="stat-value">${totalPagado.toLocaleString()}</span>
            <span className="stat-label">Total Pagado</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏢</span>
          <div className="stat-info">
            <span className="stat-value">{proveedoresUnicos}</span>
            <span className="stat-label">Proveedores</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏗️</span>
          <div className="stat-info">
            <span className="stat-value">{proyectosUnicos}</span>
            <span className="stat-label">Proyectos</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <div className="stat-info">
            <span className="stat-value">{todosLosItems.length}</span>
            <span className="stat-label">Items Comprados</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Proveedor</label>
            <select value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)}>
              <option value="">Todos</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Proyecto</label>
            <select value={filtroProyecto} onChange={e => setFiltroProyecto(e.target.value)}>
              <option value="">Todos</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Desde</label>
            <input 
              type="date" 
              value={filtroFechaInicio} 
              onChange={e => setFiltroFechaInicio(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Hasta</label>
            <input 
              type="date" 
              value={filtroFechaFin} 
              onChange={e => setFiltroFechaFin(e.target.value)}
            />
          </div>
          {(filtroProveedor || filtroProyecto || filtroFechaInicio || filtroFechaFin) && (
            <button className="btn btn-sm clear-filters" onClick={limpiarFiltros}>
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div className="view-tabs">
        <button 
          className={`view-tab ${vistaActiva === 'proveedor' ? 'active' : ''}`}
          onClick={() => setVistaActiva('proveedor')}
        >
          🏢 Por Proveedor
        </button>
        <button 
          className={`view-tab ${vistaActiva === 'proyecto' ? 'active' : ''}`}
          onClick={() => setVistaActiva('proyecto')}
        >
          🏗️ Por Proyecto
        </button>
        <button 
          className={`view-tab ${vistaActiva === 'articulo' ? 'active' : ''}`}
          onClick={() => setVistaActiva('articulo')}
        >
          📦 Por Artículo
        </button>
        <button 
          className={`view-tab ${vistaActiva === 'detalle' ? 'active' : ''}`}
          onClick={() => setVistaActiva('detalle')}
        >
          📋 Detalle
        </button>
      </div>

      {/* Content */}
      <div className="compras-content">
        {/* Por Proveedor */}
        {vistaActiva === 'proveedor' && (
          <div className="grouped-list">
            {Object.values(agrupadoPorProveedor)
              .sort((a, b) => b.total - a.total)
              .map(grupo => (
                <div key={grupo.nombre} className="group-card">
                  <div className="group-header" onClick={() => toggleGrupo(grupo.nombre)}>
                    <div className="group-info">
                      <span className="group-expand">{gruposExpandidos.has(grupo.nombre) ? '▼' : '▶'}</span>
                      <span className="group-icon">🏢</span>
                      <span className="group-name">{grupo.nombre}</span>
                      <span className="group-count">{grupo.solicitudes.length} compras</span>
                    </div>
                    <span className="group-total">${grupo.total.toLocaleString()}</span>
                  </div>
                  
                  {gruposExpandidos.has(grupo.nombre) && (
                    <div className="group-content">
                      <table className="items-table">
                        <thead>
                          <tr>
                            <th>Artículo</th>
                            <th>Proyecto</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grupo.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>
                                <div className="item-cell">
                                  <span className="item-name">{item.articuloNombre || item.nombre}</span>
                                  <code>{item.articuloCodigo || item.codigo}</code>
                                </div>
                              </td>
                              <td>{item.proyectoNombre}</td>
                              <td>{item.cantidad} {item.unidad}</td>
                              <td>${(item.precioUnitario || item.precioEstimado || 0).toLocaleString()}</td>
                              <td className="subtotal">
                                ${((item.cantidad || 0) * (item.precioUnitario || item.precioEstimado || 0)).toLocaleString()}
                              </td>
                              <td>{item.fecha}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Por Proyecto */}
        {vistaActiva === 'proyecto' && (
          <div className="grouped-list">
            {Object.values(agrupadoPorProyecto)
              .sort((a, b) => b.total - a.total)
              .map(grupo => (
                <div key={grupo.nombre} className="group-card">
                  <div className="group-header" onClick={() => toggleGrupo(grupo.nombre)}>
                    <div className="group-info">
                      <span className="group-expand">{gruposExpandidos.has(grupo.nombre) ? '▼' : '▶'}</span>
                      <span className="group-icon">🏗️</span>
                      <span className="group-name">{grupo.nombre}</span>
                      <span className="group-count">{grupo.solicitudes.length} compras</span>
                    </div>
                    <span className="group-total">${grupo.total.toLocaleString()}</span>
                  </div>
                  
                  {gruposExpandidos.has(grupo.nombre) && (
                    <div className="group-content">
                      <table className="items-table">
                        <thead>
                          <tr>
                            <th>Artículo</th>
                            <th>Proveedor</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grupo.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>
                                <div className="item-cell">
                                  <span className="item-name">{item.articuloNombre || item.nombre}</span>
                                  <code>{item.articuloCodigo || item.codigo}</code>
                                </div>
                              </td>
                              <td>{item.proveedorNombre}</td>
                              <td>{item.cantidad} {item.unidad}</td>
                              <td>${(item.precioUnitario || item.precioEstimado || 0).toLocaleString()}</td>
                              <td className="subtotal">
                                ${((item.cantidad || 0) * (item.precioUnitario || item.precioEstimado || 0)).toLocaleString()}
                              </td>
                              <td>{item.fecha}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Por Artículo */}
        {vistaActiva === 'articulo' && (
          <div className="grouped-list">
            {Object.values(agrupadoPorArticulo)
              .sort((a, b) => b.totalGasto - a.totalGasto)
              .map(grupo => (
                <div key={grupo.nombre} className="group-card articulo-card">
                  <div className="group-header" onClick={() => toggleGrupo(grupo.nombre)}>
                    <div className="group-info">
                      <span className="group-expand">{gruposExpandidos.has(grupo.nombre) ? '▼' : '▶'}</span>
                      <div className="articulo-info">
                        <span className="group-name">{grupo.nombre}</span>
                        <code>{grupo.codigo}</code>
                      </div>
                      <span className="group-count">{grupo.compras.length} compras</span>
                    </div>
                    <div className="articulo-stats">
                      <div className="articulo-stat">
                        <span className="stat-label">Total</span>
                        <span className="stat-value">{grupo.totalCantidad} {grupo.unidad}</span>
                      </div>
                      <div className="articulo-stat">
                        <span className="stat-label">Rango Precio</span>
                        <span className="stat-value price-range">
                          ${grupo.precioMin === Infinity ? 0 : grupo.precioMin.toLocaleString()} - ${grupo.precioMax.toLocaleString()}
                        </span>
                      </div>
                      <span className="group-total">${grupo.totalGasto.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {gruposExpandidos.has(grupo.nombre) && (
                    <div className="group-content">
                      <div className="proveedores-chips">
                        <span className="chips-label">Proveedores:</span>
                        {[...grupo.proveedores].map(p => (
                          <span key={p} className="proveedor-chip">{p}</span>
                        ))}
                      </div>
                      <table className="items-table">
                        <thead>
                          <tr>
                            <th>Proveedor</th>
                            <th>Proyecto</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grupo.compras.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.proveedorNombre}</td>
                              <td>{item.proyectoNombre}</td>
                              <td>{item.cantidad} {grupo.unidad}</td>
                              <td>${(item.precioUnitario || item.precioEstimado || 0).toLocaleString()}</td>
                              <td className="subtotal">
                                ${((item.cantidad || 0) * (item.precioUnitario || item.precioEstimado || 0)).toLocaleString()}
                              </td>
                              <td>{item.fecha}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Detalle */}
        {vistaActiva === 'detalle' && (
          <div className="detail-list">
            {solicitudesFiltradas
              .sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''))
              .map(sol => (
                <div key={sol.id} className="detail-card">
                  <div className="detail-header">
                    <div className="detail-info">
                      <span className="detail-folio">#{sol.folio}</span>
                      <span className={`estado-badge ${getEstadoBadge(sol.estado)}`}>
                        {sol.estado}
                      </span>
                    </div>
                    <span className="detail-total">${(sol.total || sol.subtotalEstimado || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="detail-meta">
                    <div className="meta-item">
                      <span className="meta-label">Proveedor</span>
                      <span className="meta-value">{sol.proveedorNombre || 'Sin asignar'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Proyecto</span>
                      <span className="meta-value">{sol.proyectoNombre}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Fecha</span>
                      <span className="meta-value">{sol.fechaCreacion}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Solicitado por</span>
                      <span className="meta-value">{sol.solicitadoPor}</span>
                    </div>
                  </div>

                  <div className="detail-items">
                    {(sol.items || []).map((item, idx) => (
                      <div key={idx} className="detail-item">
                        <span className="item-name">{item.articuloNombre || item.nombre}</span>
                        <span className="item-qty">{item.cantidad} {item.unidad}</span>
                        <span className="item-price">${(item.precioUnitario || item.precioEstimado || 0).toLocaleString()}</span>
                        <span className="item-subtotal">
                          ${((item.cantidad || 0) * (item.precioUnitario || item.precioEstimado || 0)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {solicitudesFiltradas.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">📊</span>
            <h3>No hay compras registradas</h3>
            <p>Las compras aparecerán aquí cuando se aprueben y procesen solicitudes</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Compras
