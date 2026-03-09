import { useState, useEffect } from 'react'
import './Shared.css'
import './Inventario.css'

const Inventario = () => {
  const [inventario, setInventario] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevoItem, setNuevoItem] = useState({
    nombre: '',
    categoria: 'Material',
    cantidad: '',
    unidad: '',
    precioUnitario: '',
    ubicacion: ''
  })

  useEffect(() => {
    fetch('/api/inventario')
      .then(res => res.json())
      .then(data => setInventario(data))
      .catch(() => {
        setInventario([
          { id: 1, nombre: 'Cemento Portland', categoria: 'Material', cantidad: 500, unidad: 'Bultos', precioUnitario: 185, ubicacion: 'Bodega A' },
          { id: 2, nombre: 'Varilla 3/8"', categoria: 'Material', cantidad: 1200, unidad: 'Piezas', precioUnitario: 95, ubicacion: 'Bodega A' },
          { id: 3, nombre: 'Block 15x20x40', categoria: 'Material', cantidad: 8000, unidad: 'Piezas', precioUnitario: 12, ubicacion: 'Patio' },
          { id: 4, nombre: 'Excavadora CAT 320', categoria: 'Equipo', cantidad: 2, unidad: 'Unidades', precioUnitario: 850000, ubicacion: 'Proyecto Norte' },
          { id: 5, nombre: 'Mezcladora 1 saco', categoria: 'Equipo', cantidad: 8, unidad: 'Unidades', precioUnitario: 12500, ubicacion: 'Bodega B' },
          { id: 6, nombre: 'Arena de río', categoria: 'Material', cantidad: 45, unidad: 'm³', precioUnitario: 320, ubicacion: 'Patio' },
          { id: 7, nombre: 'Grava', categoria: 'Material', cantidad: 38, unidad: 'm³', precioUnitario: 350, ubicacion: 'Patio' },
          { id: 8, nombre: 'Andamio tubular', categoria: 'Equipo', cantidad: 15, unidad: 'Sets', precioUnitario: 4500, ubicacion: 'Bodega B' }
        ])
      })
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const item = {
      id: inventario.length + 1,
      ...nuevoItem,
      cantidad: parseFloat(nuevoItem.cantidad),
      precioUnitario: parseFloat(nuevoItem.precioUnitario)
    }

    setInventario([...inventario, item])
    setNuevoItem({
      nombre: '',
      categoria: 'Material',
      cantidad: '',
      unidad: '',
      precioUnitario: '',
      ubicacion: ''
    })
    setMostrarFormulario(false)
  }

  const handleChange = (e) => {
    setNuevoItem({
      ...nuevoItem,
      [e.target.name]: e.target.value
    })
  }

  const valorTotal = inventario.reduce((acc, item) => 
    acc + (item.cantidad * item.precioUnitario), 0
  )

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Inventario</h1>
          <div className="subtitle">Control de materiales y equipos</div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Item'}
        </button>
      </div>

      <div className="inventory-stats">
        <div className="stat-item">
          <label className="label">Total Items</label>
          <div className="stat-number">{inventario.length}</div>
        </div>
        <div className="stat-item">
          <label className="label">Materiales</label>
          <div className="stat-number">
            {inventario.filter(i => i.categoria === 'Material').length}
          </div>
        </div>
        <div className="stat-item">
          <label className="label">Equipos</label>
          <div className="stat-number">
            {inventario.filter(i => i.categoria === 'Equipo').length}
          </div>
        </div>
        <div className="stat-item accent">
          <label className="label">Valor Total Inventario</label>
          <div className="stat-number">${valorTotal.toLocaleString('es-MX')}</div>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="card form-card">
          <h3>Agregar Item al Inventario</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label className="label">Nombre del Item</label>
                <input
                  type="text"
                  name="nombre"
                  className="input"
                  value={nuevoItem.nombre}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Categoría</label>
                <select
                  name="categoria"
                  className="input"
                  value={nuevoItem.categoria}
                  onChange={handleChange}
                >
                  <option value="Material">Material</option>
                  <option value="Equipo">Equipo</option>
                  <option value="Herramienta">Herramienta</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Cantidad</label>
                <input
                  type="number"
                  name="cantidad"
                  className="input"
                  value={nuevoItem.cantidad}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Unidad</label>
                <input
                  type="text"
                  name="unidad"
                  className="input"
                  placeholder="ej: Piezas, m³, Bultos"
                  value={nuevoItem.unidad}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Precio Unitario ($)</label>
                <input
                  type="number"
                  name="precioUnitario"
                  className="input"
                  value={nuevoItem.precioUnitario}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Ubicación</label>
                <input
                  type="text"
                  name="ubicacion"
                  className="input"
                  value={nuevoItem.ubicacion}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              Agregar al Inventario
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Categoría</th>
              <th>Cantidad</th>
              <th>Precio Unit.</th>
              <th>Valor Total</th>
              <th>Ubicación</th>
            </tr>
          </thead>
          <tbody>
            {inventario.map(item => (
              <tr key={item.id}>
                <td><strong>{item.nombre}</strong></td>
                <td>
                  <code className={`category-badge category-${item.categoria.toLowerCase()}`}>
                    {item.categoria}
                  </code>
                </td>
                <td>{item.cantidad} {item.unidad}</td>
                <td>${item.precioUnitario.toLocaleString('es-MX')}</td>
                <td><strong>${(item.cantidad * item.precioUnitario).toLocaleString('es-MX')}</strong></td>
                <td><em>{item.ubicacion}</em></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Inventario

