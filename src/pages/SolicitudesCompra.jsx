import { useEffect, useState, useRef } from 'react'
import './SolicitudesCompra.css'
import { api } from '../config/api'

// Smart Search Component
const ArticuloSearch = ({ onSelect }) => {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [loading, setLoading] = useState(false)
  const [mostrar, setMostrar] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (query.length < 2) {
      setResultados([])
      return
    }

    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(api(`/api/catalogo/buscar?q=${encodeURIComponent(query)}`))
        setResultados(await res.json())
        setMostrar(true)
      } catch (error) {
        console.error('Error buscando:', error)
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timeoutRef.current)
  }, [query])

  const handleSelect = (articulo) => {
    onSelect(articulo)
    setQuery('')
    setResultados([])
    setMostrar(false)
  }

  return (
    <div className="articulo-search">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => resultados.length > 0 && setMostrar(true)}
          onBlur={() => setTimeout(() => setMostrar(false), 200)}
          placeholder="Buscar artículo del catálogo..."
          className="search-input"
        />
        {loading && <span className="search-loading">⏳</span>}
      </div>

      {mostrar && query.length >= 2 && (
        <div className="search-dropdown">
          {resultados.length > 0 ? (
            resultados.map(articulo => (
              <div
                key={articulo.id}
                className="search-result"
                onClick={() => handleSelect(articulo)}
              >
                <div className="result-main">
                  <span className="result-name">{articulo.nombre}</span>
                  <code className="result-code">{articulo.codigo}</code>
                </div>
                <div className="result-meta">
                  <span className="result-unit">{articulo.unidad}</span>
                  <span className={`result-score ${articulo.score >= 80 ? 'high' : 'medium'}`}>
                    {Math.round(articulo.score)}%
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">No se encontró "{query}"</div>
          )}
        </div>
      )}
    </div>
  )
}

// Status Badge Component
const StatusBadge = ({ estado, estados }) => {
  const estadoInfo = estados.find(e => e.id === estado) || { nombre: estado, color: '#6B7280' }
  return (
    <span 
      className="status-badge-sc" 
      style={{ background: estadoInfo.color + '20', color: estadoInfo.color, borderColor: estadoInfo.color }}
    >
      {estadoInfo.icon} {estadoInfo.nombre}
    </span>
  )
}

const SolicitudesCompra = () => {
  const [solicitudes, setSolicitudes] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [estados, setEstados] = useState([])
  const [fases, setFases] = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [estadisticas, setEstadisticas] = useState({})
  
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroProyecto, setFiltroProyecto] = useState('')
  
  const [mostrarModal, setMostrarModal] = useState(false)
  const [solicitudActual, setSolicitudActual] = useState(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  
  const [formData, setFormData] = useState({
    proyectoId: '',
    proyectoNombre: '',
    fase: '',
    proveedorId: '',
    proveedorNombre: '',
    items: [],
    notas: ''
  })

  const [mostrarDetalle, setMostrarDetalle] = useState(null)
  const [mostrarAprobacion, setMostrarAprobacion] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    cargarSolicitudes()
  }, [filtroEstado, filtroProyecto])

  const cargarDatos = async () => {
    try {
      const [estadosRes, fasesRes, plantillasRes, proyectosRes, proveedoresRes, statsRes] = await Promise.all([
        fetch(api('/api/solicitudes-compra/estados')),
        fetch(api('/api/solicitudes-compra/fases')),
        fetch(api('/api/solicitudes-compra/plantillas')),
        fetch(api('/api/proyectos')),
        fetch(api('/api/proveedores')),
        fetch(api('/api/solicitudes-compra/estadisticas'))
      ])
      
      setEstados(await estadosRes.json())
      setFases(await fasesRes.json())
      setPlantillas(await plantillasRes.json())
      setProyectos(await proyectosRes.json())
      setProveedores(await proveedoresRes.json())
      setEstadisticas(await statsRes.json())
    } catch (error) {
      console.error('Error cargando datos:', error)
      // Fallback data
      setEstados([
        { id: 'borrador', nombre: 'Borrador', color: '#6B7280', icon: '📝' },
        { id: 'solicitado', nombre: 'Solicitado', color: '#F59E0B', icon: '📤' },
        { id: 'aprobado', nombre: 'Aprobado', color: '#10B981', icon: '✓' },
        { id: 'rechazado', nombre: 'Rechazado', color: '#EF4444', icon: '✕' },
        { id: 'ordenado', nombre: 'Ordenado', color: '#3B82F6', icon: '📦' },
        { id: 'recibido', nombre: 'Recibido', color: '#8B5CF6', icon: '📥' },
        { id: 'pagado', nombre: 'Pagado', color: '#059669', icon: '💰' }
      ])
      setFases([
        { id: 'preliminares', nombre: 'Preliminares' },
        { id: 'cimentacion', nombre: 'Cimentación' },
        { id: 'estructura', nombre: 'Estructura' },
        { id: 'albanileria', nombre: 'Albañilería' },
        { id: 'instalaciones', nombre: 'Instalaciones' },
        { id: 'acabados', nombre: 'Acabados' }
      ])
    }
  }

  const cargarSolicitudes = async () => {
    try {
      let url = '/api/solicitudes-compra?'
      if (filtroEstado) url += `estado=${filtroEstado}&`
      if (filtroProyecto) url += `proyectoId=${filtroProyecto}&`
      
      const res = await fetch(url)
      setSolicitudes(await res.json())
    } catch (error) {
      console.error('Error cargando solicitudes:', error)
    }
  }

  const abrirNuevaSolicitud = () => {
    setFormData({
      proyectoId: '',
      proyectoNombre: '',
      fase: '',
      proveedorId: '',
      proveedorNombre: '',
      items: [],
      notas: ''
    })
    setSolicitudActual(null)
    setModoEdicion(false)
    setMostrarModal(true)
  }

  const editarSolicitud = (solicitud) => {
    setFormData({
      proyectoId: solicitud.proyectoId,
      proyectoNombre: solicitud.proyectoNombre,
      fase: solicitud.fase,
      proveedorId: solicitud.proveedorId || '',
      proveedorNombre: solicitud.proveedorNombre || '',
      items: [...solicitud.items],
      notas: solicitud.notas
    })
    setSolicitudActual(solicitud)
    setModoEdicion(true)
    setMostrarModal(true)
  }

  const handleProyectoChange = (e) => {
    const proyectoId = parseInt(e.target.value)
    const proyecto = proyectos.find(p => p.id === proyectoId)
    setFormData({
      ...formData,
      proyectoId,
      proyectoNombre: proyecto?.nombre || ''
    })
  }

  const handleProveedorChange = (e) => {
    const proveedorId = parseInt(e.target.value)
    const proveedor = proveedores.find(p => p.id === proveedorId)
    setFormData({
      ...formData,
      proveedorId,
      proveedorNombre: proveedor?.nombre || ''
    })
  }

  const agregarItem = (articulo) => {
    const existe = formData.items.find(i => i.articuloId === articulo.id)
    if (existe) {
      alert('Este artículo ya está en la lista')
      return
    }

    setFormData({
      ...formData,
      items: [...formData.items, {
        articuloId: articulo.id,
        articuloCodigo: articulo.codigo,
        articuloNombre: articulo.nombre,
        unidad: articulo.unidad,
        cantidad: 1,
        precioEstimado: 0,
        enPresupuesto: true, // TODO: Verificar contra presupuesto real
        cantidadPresupuestada: 100
      }]
    })
  }

  const actualizarItem = (index, campo, valor) => {
    const items = [...formData.items]
    items[index][campo] = valor
    setFormData({ ...formData, items })
  }

  const eliminarItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
  }

  const aplicarPlantilla = async (plantillaId) => {
    try {
      const res = await fetch(api(`/api/solicitudes-compra/plantillas/${plantillaId}`))
      const plantilla = await res.json()
      
      // Cargar detalles de cada artículo
      const itemsConDetalles = await Promise.all(
        plantilla.items.map(async (item) => {
          try {
            const artRes = await fetch(api(`/api/catalogo/${item.articuloId}`))
            const articulo = await artRes.json()
            return {
              articuloId: item.articuloId,
              articuloCodigo: item.articuloCodigo,
              articuloNombre: articulo.nombre,
              unidad: item.unidad,
              cantidad: item.cantidad,
              precioEstimado: 0,
              enPresupuesto: true,
              cantidadPresupuestada: 100
            }
          } catch {
            return null
          }
        })
      )
      
      setFormData({
        ...formData,
        items: [...formData.items, ...itemsConDetalles.filter(Boolean)]
      })
    } catch (error) {
      console.error('Error aplicando plantilla:', error)
    }
  }

  const calcularTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.cantidad * item.precioEstimado), 0)
  }

  const guardarSolicitud = async (enviar = false) => {
    if (!formData.proyectoId || !formData.fase) {
      alert('Seleccione proyecto y fase')
      return
    }

    if (formData.items.length === 0) {
      alert('Agregue al menos un artículo')
      return
    }

    if (enviar && !formData.proveedorId) {
      alert('Seleccione un proveedor antes de enviar')
      return
    }

    try {
      let solicitud
      
      if (modoEdicion && solicitudActual) {
        const res = await fetch(`/api/solicitudes-compra/${solicitudActual.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        solicitud = await res.json()
      } else {
        const res = await fetch(api('/api/solicitudes-compra'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            solicitadoPor: 'Usuario Actual',
            solicitadoPorRol: 'admin'
          })
        })
        solicitud = await res.json()
      }

      if (enviar) {
        await fetch(`/api/solicitudes-compra/${solicitud.id}/enviar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario: 'Usuario Actual' })
        })
      }

      setMostrarModal(false)
      cargarSolicitudes()
      cargarDatos()
    } catch (error) {
      console.error('Error guardando:', error)
    }
  }

  const aprobarSolicitud = async (id, aprobar, comentario = '') => {
    try {
      const endpoint = aprobar ? 'aprobar' : 'rechazar'
      await fetch(`/api/solicitudes-compra/${id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          usuario: 'Manager', 
          comentario: aprobar ? 'Aprobado' : comentario 
        })
      })
      
      setMostrarAprobacion(null)
      cargarSolicitudes()
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cambiarEstadoSolicitud = async (id, estado) => {
    try {
      await fetch(`/api/solicitudes-compra/${id}/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, usuario: 'Usuario Actual' })
      })
      cargarSolicitudes()
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getFaseNombre = (id) => fases.find(f => f.id === id)?.nombre || id

  return (
    <div className="solicitudes-compra-page">
      {/* Header */}
      <header className="page-header-bar">
        <div>
          <h1>Solicitudes de Compra</h1>
          <p className="subtitle">Gestión de solicitudes con aprobación</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevaSolicitud}>
          + Nueva Solicitud
        </button>
      </header>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">{estadisticas.pendientesAprobacion || 0}</span>
          <span className="stat-label">Pendientes Aprobación</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{estadisticas.porEstado?.aprobado || 0}</span>
          <span className="stat-label">Aprobadas</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{estadisticas.porEstado?.ordenado || 0}</span>
          <span className="stat-label">Ordenadas</span>
        </div>
        <div className="stat-item highlight">
          <span className="stat-number">${(estadisticas.montoTotal || 0).toLocaleString()}</span>
          <span className="stat-label">Monto Total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Estado:</label>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            {estados.map(e => (
              <option key={e.id} value={e.id}>{e.icon} {e.nombre}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Proyecto:</label>
          <select value={filtroProyecto} onChange={e => setFiltroProyecto(e.target.value)}>
            <option value="">Todos</option>
            {proyectos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Solicitudes List */}
      <div className="solicitudes-list">
        {solicitudes.map(solicitud => (
          <div key={solicitud.id} className="solicitud-card">
            <div className="solicitud-header">
              <div className="solicitud-info">
                <div className="solicitud-folio">
                  <strong>{solicitud.folio}</strong>
                  <StatusBadge estado={solicitud.estado} estados={estados} />
                </div>
                <div className="solicitud-proyecto">
                  {solicitud.proyectoNombre} • {getFaseNombre(solicitud.fase)}
                </div>
              </div>
              <div className="solicitud-monto">
                <span className="monto-value">${solicitud.subtotalEstimado?.toLocaleString()}</span>
                <span className="monto-label">Estimado</span>
              </div>
            </div>

            <div className="solicitud-body">
              <div className="solicitud-items-preview">
                {solicitud.items.slice(0, 3).map((item, idx) => (
                  <span key={idx} className="item-chip">
                    {item.articuloNombre} ({item.cantidad} {item.unidad})
                  </span>
                ))}
                {solicitud.items.length > 3 && (
                  <span className="item-chip more">+{solicitud.items.length - 3} más</span>
                )}
              </div>
              
              <div className="solicitud-meta">
                <span>📅 {solicitud.fechaSolicitud}</span>
                <span>👤 {solicitud.solicitadoPor}</span>
                {solicitud.proveedorNombre && (
                  <span>🏢 {solicitud.proveedorNombre}</span>
                )}
              </div>
            </div>

            <div className="solicitud-actions">
              {solicitud.estado === 'borrador' && (
                <>
                  <button className="btn btn-sm" onClick={() => editarSolicitud(solicitud)}>
                    ✏️ Editar
                  </button>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      if (!solicitud.proveedorId) {
                        editarSolicitud(solicitud)
                        alert('Seleccione un proveedor antes de enviar')
                      } else {
                        fetch(`/api/solicitudes-compra/${solicitud.id}/enviar`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ usuario: 'Usuario Actual' })
                        }).then(() => { cargarSolicitudes(); cargarDatos() })
                      }
                    }}
                  >
                    📤 Enviar
                  </button>
                </>
              )}
              
              {solicitud.estado === 'solicitado' && (
                <>
                  <button 
                    className="btn btn-sm btn-success"
                    onClick={() => aprobarSolicitud(solicitud.id, true)}
                  >
                    ✓ Aprobar
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => setMostrarAprobacion(solicitud)}
                  >
                    ✕ Rechazar
                  </button>
                </>
              )}

              {solicitud.estado === 'aprobado' && (
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => cambiarEstadoSolicitud(solicitud.id, 'ordenado')}
                >
                  📦 Marcar Ordenado
                </button>
              )}

              {solicitud.estado === 'ordenado' && (
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => cambiarEstadoSolicitud(solicitud.id, 'recibido')}
                >
                  📥 Marcar Recibido
                </button>
              )}

              {solicitud.estado === 'recibido' && (
                <button 
                  className="btn btn-sm btn-success"
                  onClick={() => cambiarEstadoSolicitud(solicitud.id, 'pagado')}
                >
                  💰 Marcar Pagado
                </button>
              )}

              <button 
                className="btn btn-sm"
                onClick={() => setMostrarDetalle(solicitud)}
              >
                👁️ Ver Detalle
              </button>
            </div>
          </div>
        ))}

        {solicitudes.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No hay solicitudes</h3>
            <p>Crea tu primera solicitud de compra</p>
            <button className="btn btn-primary" onClick={abrirNuevaSolicitud}>
              + Nueva Solicitud
            </button>
          </div>
        )}
      </div>

      {/* Modal Nueva/Editar Solicitud */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal solicitud-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modoEdicion ? 'Editar Solicitud' : 'Nueva Solicitud de Compra'}</h2>
              <button className="modal-close" onClick={() => setMostrarModal(false)}>✕</button>
            </div>
            
            <div className="modal-content">
              {/* Proyecto, Fase, Proveedor */}
              <div className="form-row-3">
                <div className="form-group">
                  <label className="label">Proyecto *</label>
                  <select 
                    className="input"
                    value={formData.proyectoId}
                    onChange={handleProyectoChange}
                  >
                    <option value="">Seleccionar...</option>
                    {proyectos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Fase *</label>
                  <select 
                    className="input"
                    value={formData.fase}
                    onChange={e => setFormData({...formData, fase: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    {fases.map(f => (
                      <option key={f.id} value={f.id}>{f.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Proveedor</label>
                  <select 
                    className="input"
                    value={formData.proveedorId}
                    onChange={handleProveedorChange}
                  >
                    <option value="">Seleccionar...</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <span className="quick-label">Acciones rápidas:</span>
                <div className="plantillas-dropdown">
                  <select onChange={e => e.target.value && aplicarPlantilla(e.target.value)}>
                    <option value="">📋 Usar Plantilla...</option>
                    {plantillas.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Buscar Artículos */}
              <div className="form-group">
                <label className="label">Agregar Artículos</label>
                <ArticuloSearch onSelect={agregarItem} />
              </div>

              {/* Items Table */}
              {formData.items.length > 0 && (
                <div className="items-table-wrapper">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Artículo</th>
                        <th>Cantidad</th>
                        <th>Precio Est.</th>
                        <th>Subtotal</th>
                        <th>Presupuesto</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <div className="item-cell">
                              <span className="item-name">{item.articuloNombre}</span>
                              <code className="item-code">{item.articuloCodigo}</code>
                            </div>
                          </td>
                          <td>
                            <div className="qty-input">
                              <input
                                type="number"
                                value={item.cantidad}
                                onChange={e => actualizarItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.1"
                              />
                              <span className="unit">{item.unidad}</span>
                            </div>
                          </td>
                          <td>
                            <div className="price-input">
                              <span className="currency">$</span>
                              <input
                                type="number"
                                value={item.precioEstimado}
                                onChange={e => actualizarItem(index, 'precioEstimado', parseFloat(e.target.value) || 0)}
                                min="0"
                              />
                            </div>
                          </td>
                          <td className="subtotal">
                            ${(item.cantidad * item.precioEstimado).toLocaleString()}
                          </td>
                          <td>
                            {item.enPresupuesto ? (
                              <span className="budget-ok">✓ En presupuesto</span>
                            ) : (
                              <span className="budget-warn">⚠️ No presupuestado</span>
                            )}
                          </td>
                          <td>
                            <button className="remove-btn" onClick={() => eliminarItem(index)}>
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan="3">Total Estimado</td>
                        <td colSpan="3" className="total-value">
                          ${calcularTotal().toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Notas */}
              <div className="form-group">
                <label className="label">Notas</label>
                <textarea
                  className="input"
                  value={formData.notas}
                  onChange={e => setFormData({...formData, notas: e.target.value})}
                  placeholder="Notas adicionales, urgencia, instrucciones especiales..."
                  rows="2"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => setMostrarModal(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={() => guardarSolicitud(false)}>
                💾 Guardar Borrador
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => guardarSolicitud(true)}
                disabled={!formData.proveedorId}
              >
                📤 Guardar y Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {mostrarDetalle && (
        <div className="modal-overlay" onClick={() => setMostrarDetalle(null)}>
          <div className="modal detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalle: {mostrarDetalle.folio}</h2>
              <button className="modal-close" onClick={() => setMostrarDetalle(null)}>✕</button>
            </div>
            <div className="modal-content">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Estado</label>
                  <StatusBadge estado={mostrarDetalle.estado} estados={estados} />
                </div>
                <div className="detail-item">
                  <label>Proyecto</label>
                  <span>{mostrarDetalle.proyectoNombre}</span>
                </div>
                <div className="detail-item">
                  <label>Fase</label>
                  <span>{getFaseNombre(mostrarDetalle.fase)}</span>
                </div>
                <div className="detail-item">
                  <label>Proveedor</label>
                  <span>{mostrarDetalle.proveedorNombre || 'Sin asignar'}</span>
                </div>
                <div className="detail-item">
                  <label>Solicitado por</label>
                  <span>{mostrarDetalle.solicitadoPor}</span>
                </div>
                <div className="detail-item">
                  <label>Fecha</label>
                  <span>{mostrarDetalle.fechaSolicitud}</span>
                </div>
              </div>

              <h4>Artículos</h4>
              <table className="items-table compact">
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th>Cantidad</th>
                    <th>Precio Est.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {mostrarDetalle.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.articuloNombre}</td>
                      <td>{item.cantidad} {item.unidad}</td>
                      <td>${item.precioEstimado?.toLocaleString()}</td>
                      <td>${(item.cantidad * item.precioEstimado).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3"><strong>Total</strong></td>
                    <td><strong>${mostrarDetalle.subtotalEstimado?.toLocaleString()}</strong></td>
                  </tr>
                </tfoot>
              </table>

              <h4>Historial</h4>
              <div className="historial-list">
                {mostrarDetalle.historial?.map((h, idx) => (
                  <div key={idx} className="historial-item">
                    <span className="historial-fecha">{h.fecha}</span>
                    <span className="historial-estado">{h.estado}</span>
                    <span className="historial-usuario">{h.usuario}</span>
                    {h.comentario && <span className="historial-comentario">"{h.comentario}"</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazo */}
      {mostrarAprobacion && (
        <div className="modal-overlay" onClick={() => setMostrarAprobacion(null)}>
          <div className="modal small-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rechazar Solicitud</h2>
              <button className="modal-close" onClick={() => setMostrarAprobacion(null)}>✕</button>
            </div>
            <div className="modal-content">
              <p>¿Por qué rechaza la solicitud <strong>{mostrarAprobacion.folio}</strong>?</p>
              <textarea 
                id="rechazo-motivo"
                className="input" 
                placeholder="Motivo del rechazo (requerido)"
                rows="3"
              />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setMostrarAprobacion(null)}>Cancelar</button>
              <button 
                className="btn btn-danger"
                onClick={() => {
                  const motivo = document.getElementById('rechazo-motivo').value
                  if (!motivo.trim()) {
                    alert('Ingrese el motivo del rechazo')
                    return
                  }
                  aprobarSolicitud(mostrarAprobacion.id, false, motivo)
                }}
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SolicitudesCompra

