import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './PresupuestoProyecto.css'
import { api } from '../config/api'

// Smart Search Component with Quick Add
const ArticuloSearch = ({ onSelect, onQuickAdd }) => {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [mostrar, setMostrar] = useState(false)
  const [buscado, setBuscado] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (query.length < 2) {
      setResultados([])
      setBuscado(false)
      return
    }

    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(api(`/api/catalogo/buscar?q=${encodeURIComponent(query)}`))
        const data = await res.json()
        setResultados(data)
        setBuscado(true)
        setMostrar(true)
      } catch (error) {
        console.error('Error:', error)
      }
    }, 200)

    return () => clearTimeout(timeoutRef.current)
  }, [query])

  const handleSelect = (articulo) => {
    onSelect(articulo)
    setQuery('')
    setResultados([])
    setMostrar(false)
    setBuscado(false)
  }

  const handleQuickAdd = () => {
    if (onQuickAdd) {
      onQuickAdd(query)
    }
    setMostrar(false)
  }

  return (
    <div className="articulo-search-inline">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setMostrar(true)}
        onBlur={() => setTimeout(() => setMostrar(false), 250)}
        placeholder="🔍 Buscar artículo para agregar..."
        className="search-input-inline"
      />
      {mostrar && query.length >= 2 && (
        <div className="search-dropdown-inline">
          {resultados.length > 0 ? (
            resultados.map(articulo => (
              <div key={articulo.id} className="search-result-inline" onClick={() => handleSelect(articulo)}>
                <span className="result-name">{articulo.nombre}</span>
                <code>{articulo.codigo}</code>
              </div>
            ))
          ) : buscado ? (
            <div className="no-results">
              <span>No se encontró "{query}"</span>
            </div>
          ) : null}
          
          {/* Always show quick add option */}
          <div className="search-result-inline quick-add" onClick={handleQuickAdd}>
            <span className="result-name">+ Agregar "{query}" al catálogo</span>
            <span className="quick-add-hint">Crear nuevo</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Progress Bar Component
const ProgressBar = ({ presupuestado, solicitado, recibido, pagado }) => {
  const total = presupuestado || 1
  const pctSolicitado = Math.min((solicitado / total) * 100, 100)
  const pctRecibido = Math.min((recibido / total) * 100, 100)
  const pctPagado = Math.min((pagado / total) * 100, 100)

  return (
    <div className="progress-bar-budget">
      <div className="progress-track">
        <div className="progress-fill pagado" style={{ width: `${pctPagado}%` }} title={`Pagado: ${pctPagado.toFixed(0)}%`} />
        <div className="progress-fill recibido" style={{ width: `${pctRecibido}%` }} title={`Recibido: ${pctRecibido.toFixed(0)}%`} />
        <div className="progress-fill solicitado" style={{ width: `${pctSolicitado}%` }} title={`Solicitado: ${pctSolicitado.toFixed(0)}%`} />
      </div>
      <div className="progress-labels">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  )
}

const PresupuestoProyecto = () => {
  const { proyectoId } = useParams()
  const navigate = useNavigate()
  
  const [presupuesto, setPresupuesto] = useState(null)
  const [proyecto, setProyecto] = useState(null)
  const [fasesDisponibles, setFasesDisponibles] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [faseExpandida, setFaseExpandida] = useState(null)
  
  const [mostrarAgregarItem, setMostrarAgregarItem] = useState(null) // faseId
  const [nuevoItem, setNuevoItem] = useState({ cantidad: 1, precio: 0 })
  
  const [mostrarGenerarSolicitud, setMostrarGenerarSolicitud] = useState(false)
  const [solicitudConfig, setSolicitudConfig] = useState({ faseId: '', proveedorId: '', items: [] })
  const [pendientes, setPendientes] = useState([])
  
  // Quick add to catalog
  const [mostrarQuickAdd, setMostrarQuickAdd] = useState(false)
  const [quickAddData, setQuickAddData] = useState({ nombre: '', codigo: '', categoria: 'otros', unidad: 'pza' })
  const [categorias, setCategorias] = useState([])

  useEffect(() => {
    cargarDatos()
  }, [proyectoId])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [proyectoRes, presupuestoRes, fasesRes, proveedoresRes, categoriasRes] = await Promise.all([
        fetch(api(`/api/proyectos/${proyectoId}`)),
        fetch(api(`/api/presupuestos-proyecto/proyecto/${proyectoId}`)).catch(() => ({ ok: false })),
        fetch(api('/api/presupuestos-proyecto/fases')),
        fetch(api('/api/proveedores')),
        fetch(api('/api/catalogo/categorias'))
      ])
      
      if (proyectoRes.ok) {
        setProyecto(await proyectoRes.json())
      }
      
      if (presupuestoRes.ok) {
        setPresupuesto(await presupuestoRes.json())
      }
      
      setFasesDisponibles(await fasesRes.json())
      setProveedores(await proveedoresRes.json())
      setCategorias(await categoriasRes.json())
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const crearPresupuesto = async () => {
    try {
      const res = await fetch(api('/api/presupuestos-proyecto'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyectoId: parseInt(proyectoId),
          proyectoNombre: proyecto?.nombre || 'Proyecto',
          fases: []
        })
      })
      
      if (res.ok) {
        const nuevo = await res.json()
        setPresupuesto(nuevo)
      }
    } catch (error) {
      console.error('Error creando presupuesto:', error)
    }
  }

  const agregarItem = async (faseId, articulo) => {
    if (!nuevoItem.cantidad || nuevoItem.cantidad <= 0) {
      alert('Ingrese una cantidad válida')
      return
    }

    try {
      const res = await fetch(api(`/api/presupuestos-proyecto/${presupuesto.id}/fase/${faseId}/item`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articuloId: articulo.id,
          articuloCodigo: articulo.codigo,
          articuloNombre: articulo.nombre,
          unidad: articulo.unidad,
          cantidadPresupuestada: nuevoItem.cantidad,
          precioUnitarioEstimado: nuevoItem.precio
        })
      })

      if (res.ok) {
        setMostrarAgregarItem(null)
        setNuevoItem({ cantidad: 1, precio: 0 })
        cargarDatos()
      } else {
        const error = await res.json()
        alert(error.error || 'Error agregando item')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const actualizarItem = async (faseId, itemId, campo, valor) => {
    try {
      await fetch(api(`/api/presupuestos-proyecto/${presupuesto.id}/fase/${faseId}/item/${itemId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [campo]: valor })
      })
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const eliminarItem = async (faseId, itemId) => {
    if (!confirm('¿Eliminar este item del presupuesto?')) return

    try {
      await fetch(api(`/api/presupuestos-proyecto/${presupuesto.id}/fase/${faseId}/item/${itemId}`), {
        method: 'DELETE'
      })
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Quick add to catalog
  const abrirQuickAdd = (nombreInicial) => {
    // Generate a suggested code from the name
    const palabras = nombreInicial.trim().split(' ')
    const codigo = palabras.slice(0, 2).map(p => p.substring(0, 3).toUpperCase()).join('-')
    
    setQuickAddData({
      nombre: nombreInicial,
      codigo: codigo,
      categoria: 'otros',
      unidad: 'pza'
    })
    setMostrarQuickAdd(true)
  }

  const guardarQuickAdd = async () => {
    if (!quickAddData.nombre || !quickAddData.codigo) {
      alert('Nombre y código son requeridos')
      return
    }

    try {
      const res = await fetch(api('/api/catalogo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: quickAddData.nombre,
          codigo: quickAddData.codigo,
          categoria: quickAddData.categoria,
          unidad: quickAddData.unidad
        })
      })

      if (res.ok) {
        const nuevoArticulo = await res.json()
        setMostrarQuickAdd(false)
        // Auto-select the new item
        setNuevoItem({ ...nuevoItem, articulo: nuevoArticulo })
        alert(`"${nuevoArticulo.nombre}" agregado al catálogo`)
      } else {
        const error = await res.json()
        alert(error.error || 'Error creando artículo')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const abrirGenerarSolicitud = async (faseId = null) => {
    try {
      const url = faseId 
        ? `/api/presupuestos-proyecto/${presupuesto.id}/pendientes?faseId=${faseId}`
        : `/api/presupuestos-proyecto/${presupuesto.id}/pendientes`
      
      const res = await fetch(url)
      const items = await res.json()
      
      setPendientes(items)
      setSolicitudConfig({
        faseId: faseId || '',
        proveedorId: '',
        items: items.map(i => i.id)
      })
      setMostrarGenerarSolicitud(true)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const generarSolicitud = async () => {
    if (!solicitudConfig.proveedorId) {
      alert('Seleccione un proveedor')
      return
    }

    const proveedor = proveedores.find(p => p.id === parseInt(solicitudConfig.proveedorId))
    
    try {
      const res = await fetch(api(`/api/presupuestos-proyecto/${presupuesto.id}/generar-solicitud`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faseId: solicitudConfig.faseId || null,
          proveedorId: parseInt(solicitudConfig.proveedorId),
          proveedorNombre: proveedor?.nombre,
          itemIds: solicitudConfig.items
        })
      })

      if (res.ok) {
        const solicitudData = await res.json()
        
        // Crear la solicitud
        const createRes = await fetch(api('/api/solicitudes-compra'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...solicitudData,
            solicitadoPor: 'Usuario Actual',
            solicitadoPorRol: 'admin'
          })
        })

        if (createRes.ok) {
          setMostrarGenerarSolicitud(false)
          alert('Solicitud creada exitosamente')
          navigate('/solicitudes-compra')
        }
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const toggleItemSolicitud = (itemId) => {
    const items = solicitudConfig.items.includes(itemId)
      ? solicitudConfig.items.filter(id => id !== itemId)
      : [...solicitudConfig.items, itemId]
    setSolicitudConfig({ ...solicitudConfig, items })
  }

  const calcularTotalesFase = (fase) => {
    return fase.items.reduce((acc, item) => ({
      presupuestado: acc.presupuestado + (item.subtotalEstimado || 0),
      solicitado: acc.solicitado + ((item.cantidadSolicitada || 0) * (item.precioUnitarioEstimado || 0)),
      recibido: acc.recibido + ((item.cantidadRecibida || 0) * (item.precioUnitarioEstimado || 0)),
      pagado: acc.pagado + ((item.cantidadPagada || 0) * (item.precioUnitarioEstimado || 0)),
      gastoReal: acc.gastoReal + (item.gastoReal || 0)
    }), { presupuestado: 0, solicitado: 0, recibido: 0, pagado: 0, gastoReal: 0 })
  }

  if (loading) {
    return <div className="loading">Cargando presupuesto...</div>
  }

  if (!proyecto) {
    return <div className="error">Proyecto no encontrado</div>
  }

  return (
    <div className="presupuesto-proyecto-page">
      {/* Header */}
      <header className="page-header-bar">
        <div>
          <h1>Presupuesto: {proyecto.nombre}</h1>
          <p className="subtitle">Gestión de presupuesto y seguimiento de compras</p>
        </div>
        {presupuesto && (
          <button className="btn btn-primary" onClick={() => abrirGenerarSolicitud()}>
            📤 Generar Solicitud de Pendientes
          </button>
        )}
      </header>

      {!presupuesto ? (
        /* No Budget - Create One */
        <div className="empty-state-budget">
          <div className="empty-icon">📊</div>
          <h3>No hay presupuesto para este proyecto</h3>
          <p>Crea un presupuesto para comenzar a planificar las compras</p>
          <button className="btn btn-primary btn-lg" onClick={crearPresupuesto}>
            + Crear Presupuesto
          </button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="budget-summary">
            <div className="summary-card">
              <span className="summary-label">Presupuestado</span>
              <span className="summary-value">${presupuesto.resumen?.totalPresupuestado?.toLocaleString() || 0}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Solicitado</span>
              <span className="summary-value solicitado">${presupuesto.resumen?.totalSolicitado?.toLocaleString() || 0}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Recibido</span>
              <span className="summary-value recibido">${presupuesto.resumen?.totalRecibido?.toLocaleString() || 0}</span>
            </div>
            <div className="summary-card highlight">
              <span className="summary-label">Pagado</span>
              <span className="summary-value">${presupuesto.resumen?.totalPagado?.toLocaleString() || 0}</span>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="overall-progress">
            <h4>Progreso General</h4>
            <ProgressBar 
              presupuestado={presupuesto.resumen?.totalPresupuestado}
              solicitado={presupuesto.resumen?.totalSolicitado}
              recibido={presupuesto.resumen?.totalRecibido}
              pagado={presupuesto.resumen?.totalPagado}
            />
            <div className="progress-legend">
              <span><span className="dot solicitado"></span> Solicitado</span>
              <span><span className="dot recibido"></span> Recibido</span>
              <span><span className="dot pagado"></span> Pagado</span>
            </div>
          </div>

          {/* Phases */}
          <div className="phases-section">
            <div className="phases-header">
              <h3>Fases del Proyecto</h3>
              <select 
                className="add-phase-select"
                onChange={async (e) => {
                  if (e.target.value) {
                    const faseId = e.target.value
                    const faseInfo = fasesDisponibles.find(f => f.id === faseId)
                    
                    // Add the phase to the budget with an empty items array
                    const updatedFases = [
                      ...presupuesto.fases,
                      { id: faseId, nombre: faseInfo?.nombre || faseId, items: [] }
                    ]
                    
                    try {
                      await fetch(api(`/api/presupuestos-proyecto/${presupuesto.id}`), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fases: updatedFases })
                      })
                      await cargarDatos()
                      setFaseExpandida(faseId)
                      setMostrarAgregarItem(faseId)
                    } catch (error) {
                      console.error('Error adding phase:', error)
                    }
                    e.target.value = ''
                  }
                }}
              >
                <option value="">+ Agregar Fase...</option>
                {fasesDisponibles
                  .filter(f => !presupuesto.fases.some(pf => pf.id === f.id))
                  .map(f => (
                    <option key={f.id} value={f.id}>{f.nombre}</option>
                  ))
                }
              </select>
            </div>

            {presupuesto.fases.map(fase => {
              const totales = calcularTotalesFase(fase)
              const isExpanded = faseExpandida === fase.id
              const pendientesCount = fase.items.filter(i => 
                (i.cantidadPresupuestada - i.cantidadSolicitada) > 0
              ).length

              return (
                <div key={fase.id} className={`phase-card ${isExpanded ? 'expanded' : ''}`}>
                  <div className="phase-header" onClick={() => setFaseExpandida(isExpanded ? null : fase.id)}>
                    <div className="phase-info">
                      <span className="phase-expand">{isExpanded ? '▼' : '▶'}</span>
                      <h4>{fase.nombre}</h4>
                      <span className="phase-count">{fase.items.length} items</span>
                      {pendientesCount > 0 && (
                        <span className="phase-pending">{pendientesCount} pendientes</span>
                      )}
                    </div>
                    <div className="phase-totals">
                      <span className="total-presupuestado">${totales.presupuestado.toLocaleString()}</span>
                      <ProgressBar {...totales} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="phase-content">
                      <table className="budget-table">
                        <thead>
                          <tr>
                            <th>Artículo</th>
                            <th>Presupuestado</th>
                            <th>Precio Est.</th>
                            <th>Subtotal</th>
                            <th>Solicitado</th>
                            <th>Recibido</th>
                            <th>Pagado</th>
                            <th>Pendiente</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {fase.items.map(item => {
                            const pendiente = item.cantidadPresupuestada - item.cantidadSolicitada
                            return (
                              <tr key={item.id}>
                                <td>
                                  <div className="item-info">
                                    <span className="item-name">{item.articuloNombre}</span>
                                    <code>{item.articuloCodigo}</code>
                                  </div>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={item.cantidadPresupuestada}
                                    onChange={(e) => actualizarItem(fase.id, item.id, 'cantidadPresupuestada', parseFloat(e.target.value) || 0)}
                                    className="qty-input-sm"
                                  />
                                  <span className="unit">{item.unidad}</span>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={item.precioUnitarioEstimado}
                                    onChange={(e) => actualizarItem(fase.id, item.id, 'precioUnitarioEstimado', parseFloat(e.target.value) || 0)}
                                    className="price-input-sm"
                                  />
                                </td>
                                <td className="subtotal">${item.subtotalEstimado?.toLocaleString()}</td>
                                <td className="status-solicitado">{item.cantidadSolicitada} {item.unidad}</td>
                                <td className="status-recibido">{item.cantidadRecibida} {item.unidad}</td>
                                <td className="status-pagado">{item.cantidadPagada} {item.unidad}</td>
                                <td>
                                  {pendiente > 0 ? (
                                    <span className="pendiente-badge">{pendiente} {item.unidad}</span>
                                  ) : (
                                    <span className="completo-badge">✓</span>
                                  )}
                                </td>
                                <td>
                                  <button className="btn-icon" onClick={() => eliminarItem(fase.id, item.id)}>🗑️</button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>

                      {/* Add Item Row */}
                      {mostrarAgregarItem === fase.id ? (
                        <div className="add-item-form">
                          <ArticuloSearch 
                            onSelect={(articulo) => {
                              setNuevoItem({ ...nuevoItem, articulo })
                            }}
                            onQuickAdd={(nombre) => abrirQuickAdd(nombre)}
                          />
                          {nuevoItem.articulo && (
                            <div className="add-item-details">
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '2fr 1fr 1fr auto', 
                                gap: '15px', 
                                alignItems: 'end',
                                width: '100%',
                                padding: '15px',
                                background: '#f8f9fa',
                                borderRadius: '8px'
                              }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#555' }}>
                                    Artículo Seleccionado
                                  </label>
                                  <span className="selected-item" style={{ display: 'block', padding: '8px', background: 'white', borderRadius: '4px' }}>
                                    {nuevoItem.articulo.nombre}
                                  </span>
                                </div>
                                
                                <div>
                                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#555' }}>
                                    Cantidad *
                                  </label>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <input
                                      type="number"
                                      placeholder="Ej: 10"
                                      value={nuevoItem.cantidad}
                                      onChange={(e) => setNuevoItem({...nuevoItem, cantidad: parseFloat(e.target.value) || 0})}
                                      className="qty-input-sm"
                                      style={{ width: '80px' }}
                                    />
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#666' }}>
                                      {nuevoItem.articulo.unidad}
                                    </span>
                                  </div>
                                </div>
                                
                                <div>
                                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#555' }}>
                                    Precio por {nuevoItem.articulo.unidad} *
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="Ej: 250"
                                    value={nuevoItem.precio}
                                    onChange={(e) => setNuevoItem({...nuevoItem, precio: parseFloat(e.target.value) || 0})}
                                    className="price-input-sm"
                                    style={{ width: '100px' }}
                                  />
                                </div>
                                
                                <div style={{ display: 'flex', gap: '8px', paddingTop: '20px' }}>
                                  <button className="btn btn-sm btn-primary" onClick={() => agregarItem(fase.id, nuevoItem.articulo)}>
                                    Agregar
                                  </button>
                                  <button className="btn btn-sm" onClick={() => {
                                    setMostrarAgregarItem(null)
                                    setNuevoItem({ cantidad: 1, precio: 0 })
                                  }}>
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                              
                              {nuevoItem.cantidad > 0 && nuevoItem.precio > 0 && (
                                <div style={{ marginTop: '10px', padding: '10px', background: '#e8f5e9', borderRadius: '4px', fontSize: '14px' }}>
                                  <strong>Subtotal estimado:</strong> ${(nuevoItem.cantidad * nuevoItem.precio).toLocaleString('es-MX')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button 
                          className="add-item-btn"
                          onClick={() => setMostrarAgregarItem(fase.id)}
                        >
                          + Agregar artículo a {fase.nombre}
                        </button>
                      )}

                      {/* Generate Request for Phase */}
                      {pendientesCount > 0 && (
                        <button 
                          className="generate-request-btn"
                          onClick={() => abrirGenerarSolicitud(fase.id)}
                        >
                          📤 Generar Solicitud para {pendientesCount} items pendientes
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {presupuesto.fases.length === 0 && (
              <div className="empty-phases">
                <p>No hay fases definidas. Selecciona una fase para comenzar.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Generate Request Modal */}
      {mostrarGenerarSolicitud && (
        <div className="modal-overlay" onClick={() => setMostrarGenerarSolicitud(false)}>
          <div className="modal generate-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Generar Solicitud de Compra</h2>
              <button className="modal-close" onClick={() => setMostrarGenerarSolicitud(false)}>✕</button>
            </div>
            <div className="modal-content">
              <p className="modal-desc">
                Selecciona los items pendientes y el proveedor para generar una solicitud de compra automáticamente.
              </p>

              <div className="form-group">
                <label className="label">Proveedor *</label>
                <select
                  className="input"
                  value={solicitudConfig.proveedorId}
                  onChange={(e) => setSolicitudConfig({...solicitudConfig, proveedorId: e.target.value})}
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="pending-items-list">
                <label className="label">Items a Solicitar ({solicitudConfig.items.length} seleccionados)</label>
                {pendientes.map(item => (
                  <div key={item.id} className="pending-item">
                    <input
                      type="checkbox"
                      checked={solicitudConfig.items.includes(item.id)}
                      onChange={() => toggleItemSolicitud(item.id)}
                    />
                    <span className="pending-name">{item.articuloNombre}</span>
                    <span className="pending-fase">{item.faseNombre}</span>
                    <span className="pending-qty">{item.cantidadPendiente} {item.unidad}</span>
                    <span className="pending-price">${(item.cantidadPendiente * item.precioUnitarioEstimado).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="total-solicitud">
                Total estimado: $
                {pendientes
                  .filter(p => solicitudConfig.items.includes(p.id))
                  .reduce((sum, p) => sum + (p.cantidadPendiente * p.precioUnitarioEstimado), 0)
                  .toLocaleString()
                }
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setMostrarGenerarSolicitud(false)}>Cancelar</button>
              <button 
                className="btn btn-primary"
                onClick={generarSolicitud}
                disabled={!solicitudConfig.proveedorId || solicitudConfig.items.length === 0}
              >
                Generar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add to Catalog Modal */}
      {mostrarQuickAdd && (
        <div className="modal-overlay" onClick={() => setMostrarQuickAdd(false)}>
          <div className="modal quick-add-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Agregar al Catálogo</h2>
              <button className="modal-close" onClick={() => setMostrarQuickAdd(false)}>✕</button>
            </div>
            <div className="modal-content">
              <p className="modal-desc">
                Este artículo no existe en el catálogo. Agrégalo para poder usarlo en presupuestos y compras.
              </p>

              <div className="form-group">
                <label className="label">Nombre del Artículo *</label>
                <input
                  type="text"
                  className="input"
                  value={quickAddData.nombre}
                  onChange={(e) => setQuickAddData({...quickAddData, nombre: e.target.value})}
                  placeholder="Ej: Mecánica de Suelos"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">Código *</label>
                  <input
                    type="text"
                    className="input"
                    value={quickAddData.codigo}
                    onChange={(e) => setQuickAddData({...quickAddData, codigo: e.target.value.toUpperCase()})}
                    placeholder="Ej: MEC-SUE"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Unidad *</label>
                  <select
                    className="input"
                    value={quickAddData.unidad}
                    onChange={(e) => setQuickAddData({...quickAddData, unidad: e.target.value})}
                  >
                    <option value="pza">Pieza</option>
                    <option value="m">Metro</option>
                    <option value="m2">Metro²</option>
                    <option value="m3">Metro³</option>
                    <option value="kg">Kilogramo</option>
                    <option value="ton">Tonelada</option>
                    <option value="lt">Litro</option>
                    <option value="bulto">Bulto</option>
                    <option value="rollo">Rollo</option>
                    <option value="servicio">Servicio</option>
                    <option value="viaje">Viaje</option>
                    <option value="estudio">Estudio</option>
                    <option value="global">Global</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Categoría</label>
                <select
                  className="input"
                  value={quickAddData.categoria}
                  onChange={(e) => setQuickAddData({...quickAddData, categoria: e.target.value})}
                >
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                  <option value="servicios">Servicios</option>
                  <option value="estudios">Estudios</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setMostrarQuickAdd(false)}>Cancelar</button>
              <button 
                className="btn btn-primary"
                onClick={guardarQuickAdd}
                disabled={!quickAddData.nombre || !quickAddData.codigo}
              >
                Agregar al Catálogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PresupuestoProyecto

