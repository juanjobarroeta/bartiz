import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './PresupuestoProyecto.css'
import { api } from '../config/api'

const CotizacionDetalle = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cotizacion, setCotizacion] = useState(null)
  const [proyecto, setProyecto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editandoMargen, setEditandoMargen] = useState(false)
  const [nuevoMargen, setNuevoMargen] = useState(20)

  useEffect(() => {
    cargarDatos()
  }, [id])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const cotizacionRes = await fetch(api(`/api/cotizaciones/${id}`))
      
      if (cotizacionRes.ok) {
        const cotizacionData = await cotizacionRes.json()
        setCotizacion(cotizacionData)
        setNuevoMargen(cotizacionData.margenGlobal)

        if (cotizacionData.proyectoId) {
          const proyectoRes = await fetch(api(`/api/proyectos/${cotizacionData.proyectoId}`))
          if (proyectoRes.ok) {
            setProyecto(await proyectoRes.json())
          }
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const actualizarEstado = async (nuevoEstado) => {
    try {
      await fetch(api(`/api/cotizaciones/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      })
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const aplicarNuevoMargen = async () => {
    if (!confirm(`¿Aplicar margen de ${nuevoMargen}% a todos los items?`)) return
    
    try {
      await fetch(api(`/api/cotizaciones/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ margenGlobal: nuevoMargen })
      })
      setEditandoMargen(false)
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Group items by fase
  const itemsPorFase = {}
  cotizacion?.items?.forEach(item => {
    const fase = item.faseNombre || 'Varios'
    if (!itemsPorFase[fase]) {
      itemsPorFase[fase] = []
    }
    itemsPorFase[fase].push(item)
  })

  if (loading) {
    return <div className="loading">Cargando cotización...</div>
  }

  if (!cotizacion) {
    return <div className="loading">Cotización no encontrada</div>
  }

  return (
    <div className="presupuesto-proyecto-page">
      {/* Header */}
      <header className="page-header-bar">
        <div>
          <button className="btn-back" onClick={() => navigate('/cotizaciones')}>← Volver a Cotizaciones</button>
          <h1>Cotización: {cotizacion.nombreCotizacion}</h1>
          <p className="subtitle">{proyecto?.nombre || cotizacion.proyectoNombre}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href={api(`/api/cotizaciones/${id}/pdf`)}
            download
            className="btn btn-outline"
            style={{ textDecoration: 'none' }}
          >
            📄 Descargar PDF
          </a>
          <select
            className="input"
            value={cotizacion.estado}
            onChange={(e) => actualizarEstado(e.target.value)}
            style={{ width: 'auto', padding: '0.5rem 1rem' }}
          >
            <option value="borrador">📝 Borrador</option>
            <option value="enviada">📤 Enviada</option>
            <option value="aceptada">✅ Aceptada</option>
            <option value="rechazada">❌ Rechazada</option>
          </select>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="budget-summary">
        <div className="summary-card">
          <span className="summary-label">Costo Total</span>
          <span className="summary-value" style={{ color: '#ef4444' }}>
            ${cotizacion.resumen?.totalCosto?.toLocaleString() || 0}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Precio al Cliente</span>
          <span className="summary-value" style={{ color: '#10b981' }}>
            ${cotizacion.resumen?.totalVenta?.toLocaleString() || 0}
          </span>
        </div>
        <div className="summary-card highlight">
          <span className="summary-label">Utilidad</span>
          <span className="summary-value">
            ${cotizacion.resumen?.utilidad?.toLocaleString() || 0}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Margen Global</span>
          <span className="summary-value">
            {cotizacion.resumen?.margenPorcentaje?.toFixed(1) || 0}%
          </span>
        </div>
        {cotizacion.incluirIva && (
          <div className="summary-card">
            <span className="summary-label">Total con IVA</span>
            <span className="summary-value">
              ${cotizacion.resumen?.totalConIva?.toLocaleString() || 0}
            </span>
          </div>
        )}
      </div>

      {/* Quote Info */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>Cliente</label>
            <div style={{ fontWeight: '600' }}>{cotizacion.clienteNombre || 'No especificado'}</div>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>Tipo</label>
            <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>{cotizacion.tipoCliente}</div>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>Margen Aplicado</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {editandoMargen ? (
                <>
                  <input
                    type="number"
                    value={nuevoMargen}
                    onChange={(e) => setNuevoMargen(parseFloat(e.target.value) || 0)}
                    className="input"
                    style={{ width: '80px' }}
                    step="0.5"
                  />
                  <button className="btn btn-sm btn-primary" onClick={aplicarNuevoMargen}>✓</button>
                  <button className="btn btn-sm" onClick={() => setEditandoMargen(false)}>✕</button>
                </>
              ) : (
                <>
                  <span style={{ fontWeight: '600', fontSize: '18px' }}>{cotizacion.margenGlobal}%</span>
                  <button className="btn btn-sm" onClick={() => setEditandoMargen(true)}>Editar</button>
                </>
              )}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>Validez</label>
            <div style={{ fontWeight: '600' }}>{cotizacion.validezDias} días</div>
          </div>
        </div>
      </div>

      {/* Items by Phase */}
      <div className="fases-container">
        <h3 style={{ marginBottom: '15px' }}>Desglose de Cotización</h3>
        
        {Object.entries(itemsPorFase).map(([faseNombre, items]) => {
          const totalFaseCosto = items.reduce((sum, i) => sum + parseFloat(i.subtotalCosto || 0), 0)
          const totalFaseVenta = items.reduce((sum, i) => sum + parseFloat(i.subtotalVenta || 0), 0)
          
          return (
            <div key={faseNombre} className="phase-card expanded">
              <div className="phase-header" style={{ cursor: 'default' }}>
                <div className="phase-info">
                  <h4>{faseNombre}</h4>
                  <span className="phase-count">{items.length} items</span>
                </div>
                <div style={{ display: 'flex', gap: '15px', fontSize: '14px' }}>
                  <span>Costo: <strong style={{ color: '#ef4444' }}>${totalFaseCosto.toLocaleString()}</strong></span>
                  <span>Venta: <strong style={{ color: '#10b981' }}>${totalFaseVenta.toLocaleString()}</strong></span>
                </div>
              </div>

              <div className="phase-content">
                <table className="budget-table">
                  <thead>
                    <tr>
                      <th>Artículo</th>
                      <th>Cantidad</th>
                      <th>Costo Unit.</th>
                      <th>Precio Venta</th>
                      <th>Margen %</th>
                      <th>Subtotal Costo</th>
                      <th>Subtotal Venta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div className="item-info">
                            <span className="item-name">{item.articuloNombre}</span>
                            {item.articuloCodigo && <code>{item.articuloCodigo}</code>}
                          </div>
                        </td>
                        <td>{parseFloat(item.cantidad).toFixed(2)} {item.unidad}</td>
                        <td style={{ color: '#ef4444' }}>${parseFloat(item.costoUnitario).toLocaleString()}</td>
                        <td style={{ color: '#10b981' }}>${parseFloat(item.precioVentaUnitario).toLocaleString()}</td>
                        <td style={{ fontWeight: '600', color: item.margenPorcentaje >= 20 ? '#10b981' : '#f59e0b' }}>
                          {parseFloat(item.margenPorcentaje || 0).toFixed(1)}%
                        </td>
                        <td style={{ color: '#ef4444', fontWeight: '600' }}>
                          ${parseFloat(item.subtotalCosto || 0).toLocaleString()}
                        </td>
                        <td style={{ color: '#10b981', fontWeight: '600' }}>
                          ${parseFloat(item.subtotalVenta || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CotizacionDetalle
