import { useEffect, useState } from 'react'
import './Catalogo.css'

const Catalogo = () => {
  const [articulos, setArticulos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [unidades, setUnidades] = useState([])
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [articuloEditando, setArticuloEditando] = useState(null)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    unidad: '',
    codigo: '',
    aliases: '',
    especificaciones: ''
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (busqueda.length >= 2) {
      buscarArticulos(busqueda)
    } else if (busqueda.length === 0) {
      cargarArticulos()
    }
  }, [busqueda, filtroCategoria])

  const cargarDatos = async () => {
    try {
      const [articulosRes, categoriasRes, unidadesRes] = await Promise.all([
        fetch('/api/catalogo'),
        fetch('/api/catalogo/categorias'),
        fetch('/api/catalogo/unidades')
      ])
      
      setArticulos(await articulosRes.json())
      setCategorias(await categoriasRes.json())
      setUnidades(await unidadesRes.json())
    } catch (error) {
      console.error('Error cargando datos:', error)
      // Datos de fallback
      setCategorias([
        { id: 'acero', nombre: 'Acero', icon: '🔩' },
        { id: 'cemento', nombre: 'Cemento y Mortero', icon: '🧱' },
        { id: 'agregados', nombre: 'Agregados', icon: '�ite' },
        { id: 'tuberias', nombre: 'Tuberías', icon: '🔧' },
        { id: 'madera', nombre: 'Madera', icon: '🪵' },
        { id: 'electrico', nombre: 'Eléctrico', icon: '⚡' },
        { id: 'pintura', nombre: 'Pintura', icon: '🎨' },
        { id: 'seguridad', nombre: 'Seguridad', icon: '🦺' }
      ])
      setUnidades([
        { id: 'ton', nombre: 'Tonelada', abrev: 'ton' },
        { id: 'kg', nombre: 'Kilogramo', abrev: 'kg' },
        { id: 'pza', nombre: 'Pieza', abrev: 'pza' },
        { id: 'bulto', nombre: 'Bulto', abrev: 'bto' },
        { id: 'm', nombre: 'Metro', abrev: 'm' },
        { id: 'm3', nombre: 'Metro cúbico', abrev: 'm³' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const cargarArticulos = async () => {
    try {
      const url = filtroCategoria 
        ? `/api/catalogo?categoria=${filtroCategoria}`
        : '/api/catalogo'
      const res = await fetch(url)
      setArticulos(await res.json())
    } catch (error) {
      console.error('Error cargando artículos:', error)
    }
  }

  const buscarArticulos = async (query) => {
    try {
      const res = await fetch(`/api/catalogo/buscar?q=${encodeURIComponent(query)}`)
      let resultados = await res.json()
      
      if (filtroCategoria) {
        resultados = resultados.filter(a => a.categoria === filtroCategoria)
      }
      
      setArticulos(resultados)
    } catch (error) {
      console.error('Error buscando:', error)
    }
  }

  const abrirModal = (articulo = null) => {
    if (articulo) {
      setArticuloEditando(articulo)
      setFormData({
        nombre: articulo.nombre,
        categoria: articulo.categoria,
        unidad: articulo.unidad,
        codigo: articulo.codigo,
        aliases: articulo.aliases.join(', '),
        especificaciones: JSON.stringify(articulo.especificaciones || {})
      })
    } else {
      setArticuloEditando(null)
      setFormData({
        nombre: '',
        categoria: '',
        unidad: '',
        codigo: '',
        aliases: '',
        especificaciones: ''
      })
    }
    setMostrarModal(true)
  }

  const cerrarModal = () => {
    setMostrarModal(false)
    setArticuloEditando(null)
  }

  const guardarArticulo = async (e) => {
    e.preventDefault()
    
    const datos = {
      nombre: formData.nombre,
      categoria: formData.categoria,
      unidad: formData.unidad,
      codigo: formData.codigo || undefined,
      aliases: formData.aliases.split(',').map(a => a.trim()).filter(a => a),
      especificaciones: formData.especificaciones ? JSON.parse(formData.especificaciones) : {}
    }

    try {
      const url = articuloEditando 
        ? `/api/catalogo/${articuloEditando.id}`
        : '/api/catalogo'
      
      const res = await fetch(url, {
        method: articuloEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      })

      if (res.ok) {
        cerrarModal()
        cargarArticulos()
      }
    } catch (error) {
      console.error('Error guardando:', error)
    }
  }

  const eliminarArticulo = async (id) => {
    if (!confirm('¿Eliminar este artículo del catálogo?')) return

    try {
      const res = await fetch(`/api/catalogo/${id}`, { method: 'DELETE' })
      if (res.ok) {
        cargarArticulos()
      }
    } catch (error) {
      console.error('Error eliminando:', error)
    }
  }

  const getCategoriaNombre = (id) => {
    const cat = categorias.find(c => c.id === id)
    return cat ? cat.nombre : id
  }

  const getCategoriaIcon = (id) => {
    const cat = categorias.find(c => c.id === id)
    return cat ? cat.icon : '📦'
  }

  const getUnidadAbrev = (id) => {
    const unidad = unidades.find(u => u.id === id)
    return unidad ? unidad.abrev : id
  }

  if (loading) {
    return <div className="loading">Cargando catálogo...</div>
  }

  return (
    <div className="catalogo-page">
      {/* Header */}
      <header className="page-header-bar">
        <div>
          <h1>Catálogo de Artículos</h1>
          <p className="subtitle">Gestiona el catálogo maestro de materiales y productos</p>
        </div>
        <button className="btn btn-primary" onClick={() => abrirModal()}>
          + Nuevo Artículo
        </button>
      </header>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box-large">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar artículos (ej: varilla 3/8, cemento, tubo pvc...)"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="search-input"
          />
          {busqueda && (
            <button className="clear-btn" onClick={() => setBusqueda('')}>✕</button>
          )}
        </div>
        
        <div className="category-filters">
          <button 
            className={`category-chip ${!filtroCategoria ? 'active' : ''}`}
            onClick={() => setFiltroCategoria('')}
          >
            Todos
          </button>
          {categorias.slice(0, 6).map(cat => (
            <button
              key={cat.id}
              className={`category-chip ${filtroCategoria === cat.id ? 'active' : ''}`}
              onClick={() => setFiltroCategoria(cat.id)}
            >
              {cat.icon} {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Results info */}
      {busqueda && (
        <div className="search-results-info">
          {articulos.length} resultado{articulos.length !== 1 ? 's' : ''} para "{busqueda}"
          {articulos.length > 0 && articulos[0].score && (
            <span className="match-indicator"> • Ordenados por relevancia</span>
          )}
        </div>
      )}

      {/* Articles Grid */}
      <div className="articles-grid">
        {articulos.map(articulo => (
          <div key={articulo.id} className="article-card">
            <div className="article-header">
              <span className="article-icon">{getCategoriaIcon(articulo.categoria)}</span>
              <code className="article-code">{articulo.codigo}</code>
              {articulo.score && (
                <span className="match-score">{Math.round(articulo.score)}%</span>
              )}
            </div>
            
            <h3 className="article-name">{articulo.nombre}</h3>
            
            <div className="article-meta">
              <span className="meta-tag category">{getCategoriaNombre(articulo.categoria)}</span>
              <span className="meta-tag unit">{getUnidadAbrev(articulo.unidad)}</span>
            </div>
            
            {articulo.aliases && articulo.aliases.length > 0 && (
              <div className="article-aliases">
                <span className="aliases-label">También:</span>
                <span className="aliases-list">{articulo.aliases.slice(0, 3).join(', ')}</span>
              </div>
            )}
            
            <div className="article-actions">
              <button className="action-btn edit" onClick={() => abrirModal(articulo)}>
                ✏️ Editar
              </button>
              <button className="action-btn delete" onClick={() => eliminarArticulo(articulo.id)}>
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {articulos.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No se encontraron artículos</h3>
          <p>
            {busqueda 
              ? `No hay resultados para "${busqueda}". ¿Deseas crear un nuevo artículo?`
              : 'Comienza agregando artículos al catálogo'
            }
          </p>
          <button className="btn btn-primary" onClick={() => abrirModal()}>
            + Crear Artículo
          </button>
        </div>
      )}

      {/* Modal */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{articuloEditando ? 'Editar Artículo' : 'Nuevo Artículo'}</h2>
              <button className="modal-close" onClick={cerrarModal}>✕</button>
            </div>
            
            <form onSubmit={guardarArticulo} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Nombre *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                    placeholder="Ej: Varilla Corrugada 3/8&quot;"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Código</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.codigo}
                    onChange={e => setFormData({...formData, codigo: e.target.value})}
                    placeholder="Auto-generado si vacío"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">Categoría *</label>
                  <select
                    className="input"
                    value={formData.categoria}
                    onChange={e => setFormData({...formData, categoria: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Unidad *</label>
                  <select
                    className="input"
                    value={formData.unidad}
                    onChange={e => setFormData({...formData, unidad: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} ({u.abrev})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Aliases (separados por coma)</label>
                <input
                  type="text"
                  className="input"
                  value={formData.aliases}
                  onChange={e => setFormData({...formData, aliases: e.target.value})}
                  placeholder="varilla 3/8, fierro 3/8, barilla 3/8"
                />
                <span className="form-hint">
                  Incluye variaciones comunes y errores de escritura para mejorar la búsqueda
                </span>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {articuloEditando ? 'Guardar Cambios' : 'Crear Artículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Catalogo

