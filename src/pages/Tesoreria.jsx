import { useState, useEffect } from 'react'
import './Tesoreria.css'
import { api } from '../config/api'

const Tesoreria = () => {
  const [solicitudes, setSolicitudes] = useState([])
  const [solicitudesPagadas, setSolicitudesPagadas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('aprobado') // aprobado, ordenado, recibido
  const [vistaActiva, setVistaActiva] = useState('pendientes') // pendientes, pagados
  const [cuentasBancarias, setCuentasBancarias] = useState([
    { id: 1, nombre: 'BBVA Cuenta Principal', banco: 'BBVA', numero: '****1234', saldo: 3500000, color: '#0048A0' },
    { id: 2, nombre: 'Santander Nómina', banco: 'Santander', numero: '****5678', saldo: 850000, color: '#EC0000' },
    { id: 3, nombre: 'Banorte Proveedores', banco: 'Banorte', numero: '****9012', saldo: 1650000, color: '#E30613' }
  ])
  
  const [mostrarModal, setMostrarModal] = useState(false)
  const [solicitudPago, setSolicitudPago] = useState(null)
  const [formPago, setFormPago] = useState({
    cuentaBancaria: '',
    metodoPago: 'transferencia',
    referencia: '',
    fechaPago: new Date().toISOString().split('T')[0],
    notas: ''
  })

  useEffect(() => {
    cargarSolicitudes()
  }, [])

  const cargarSolicitudes = async () => {
    try {
      const res = await fetch(api('/api/solicitudes-compra'))
      const data = await res.json()
      // Filter to show aprobado, ordenado, recibido (ready for payment stages)
      const paraTesoreria = data.filter(s => 
        ['aprobado', 'ordenado', 'recibido'].includes(s.estado?.toLowerCase())
      )
      // Also get paid ones for history
      const pagadas = data.filter(s => s.estado?.toLowerCase() === 'pagado')
      setSolicitudes(paraTesoreria)
      setSolicitudesPagadas(pagadas)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const abrirModalPago = (solicitud) => {
    setSolicitudPago(solicitud)
    setFormPago({
      cuentaBancaria: '',
      metodoPago: 'transferencia',
      referencia: `PAG-${solicitud.id}-${Date.now().toString().slice(-6)}`,
      fechaPago: new Date().toISOString().split('T')[0],
      notas: ''
    })
    setMostrarModal(true)
  }

  const ejecutarPago = async () => {
    if (!formPago.cuentaBancaria) {
      alert('Selecciona una cuenta bancaria')
      return
    }

    try {
      // Update solicitud status to pagado
      const res = await fetch(`/api/solicitudes-compra/${solicitudPago.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estado: 'pagado',
          pago: {
            cuentaBancaria: formPago.cuentaBancaria,
            metodoPago: formPago.metodoPago,
            referencia: formPago.referencia,
            fechaPago: formPago.fechaPago,
            notas: formPago.notas
          }
        })
      })

      if (res.ok) {
        // Update local state
        setSolicitudes(prev => prev.filter(s => s.id !== solicitudPago.id))
        
        // Update bank balance (mock)
        const cuenta = cuentasBancarias.find(c => c.id === parseInt(formPago.cuentaBancaria))
        const montoTotal = solicitudPago.total || solicitudPago.subtotalEstimado || 0
        if (cuenta) {
          setCuentasBancarias(prev => prev.map(c => 
            c.id === cuenta.id 
              ? { ...c, saldo: c.saldo - montoTotal }
              : c
          ))
        }

        alert(`✅ Pago ejecutado exitosamente\nReferencia: ${formPago.referencia}`)
        setMostrarModal(false)
        setSolicitudPago(null)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al ejecutar el pago')
    }
  }

  const marcarOrdenado = async (solicitud) => {
    try {
      await fetch(`/api/solicitudes-compra/${solicitud.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'ordenado' })
      })
      cargarSolicitudes()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const marcarRecibido = async (solicitud) => {
    try {
      await fetch(`/api/solicitudes-compra/${solicitud.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'recibido' })
      })
      cargarSolicitudes()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Filter by selected estado
  const solicitudesFiltradas = filtroEstado === 'todos'
    ? solicitudes
    : solicitudes.filter(s => s.estado?.toLowerCase() === filtroEstado.toLowerCase())

  // Stats
  const totalPorPagar = solicitudes.reduce((sum, s) => sum + (s.total || s.subtotalEstimado || 0), 0)
  const totalPagado = solicitudesPagadas.reduce((sum, s) => sum + (s.total || s.subtotalEstimado || 0), 0)
  const aprobadas = solicitudes.filter(s => s.estado?.toLowerCase() === 'aprobado').length
  const ordenadas = solicitudes.filter(s => s.estado?.toLowerCase() === 'ordenado').length
  const recibidas = solicitudes.filter(s => s.estado?.toLowerCase() === 'recibido').length
  const saldoTotalBancos = cuentasBancarias.reduce((sum, c) => sum + c.saldo, 0)

  const getEstadoBadge = (estado) => {
    const e = estado?.toLowerCase()
    switch(e) {
      case 'aprobado': return 'badge-aprobado'
      case 'ordenado': return 'badge-ordenado'
      case 'recibido': return 'badge-recibido'
      default: return ''
    }
  }

  const getEstadoLabel = (estado) => {
    const e = estado?.toLowerCase()
    switch(e) {
      case 'aprobado': return 'Aprobado'
      case 'ordenado': return 'Ordenado'
      case 'recibido': return 'Recibido'
      default: return estado
    }
  }

  if (loading) {
    return <div className="loading">Cargando tesorería...</div>
  }

  return (
    <div className="tesoreria-page">
      {/* Header */}
      <header className="page-header-bar">
        <div>
          <h1>Tesorería</h1>
          <p className="subtitle">Gestión de pagos y cuentas bancarias</p>
        </div>
      </header>

      {/* Stats Row */}
      <div className="tesoreria-stats">
        <div className="stat-card highlight">
          <span className="stat-icon">💰</span>
          <div className="stat-info">
            <span className="stat-value">${totalPorPagar.toLocaleString()}</span>
            <span className="stat-label">Por Pagar</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✓</span>
          <div className="stat-info">
            <span className="stat-value">{aprobadas}</span>
            <span className="stat-label">Aprobadas</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <div className="stat-info">
            <span className="stat-value">{ordenadas}</span>
            <span className="stat-label">Ordenadas</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-info">
            <span className="stat-value">{recibidas}</span>
            <span className="stat-label">Recibidas</span>
          </div>
        </div>
        <div className="stat-card bank">
          <span className="stat-icon">🏦</span>
          <div className="stat-info">
            <span className="stat-value">${saldoTotalBancos.toLocaleString()}</span>
            <span className="stat-label">Saldo en Bancos</span>
          </div>
        </div>
      </div>

      {/* Bank Accounts */}
      <div className="bank-accounts-section">
        <h3>Cuentas Bancarias</h3>
        <div className="bank-cards">
          {cuentasBancarias.map(cuenta => (
            <div key={cuenta.id} className="bank-card" style={{ borderLeftColor: cuenta.color }}>
              <div className="bank-header">
                <span className="bank-name">{cuenta.nombre}</span>
                <span className="bank-badge">{cuenta.banco}</span>
              </div>
              <div className="bank-number">{cuenta.numero}</div>
              <div className="bank-balance">${cuenta.saldo.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* View Tabs */}
      <div className="view-tabs-container">
        <button 
          className={`view-tab ${vistaActiva === 'pendientes' ? 'active' : ''}`}
          onClick={() => setVistaActiva('pendientes')}
        >
          <span className="tab-icon">⏳</span>
          <span className="tab-label">Por Pagar</span>
          <span className="tab-count">{solicitudes.length}</span>
        </button>
        <button 
          className={`view-tab ${vistaActiva === 'pagados' ? 'active' : ''}`}
          onClick={() => setVistaActiva('pagados')}
        >
          <span className="tab-icon">✅</span>
          <span className="tab-label">Pagados</span>
          <span className="tab-count">{solicitudesPagadas.length}</span>
        </button>
      </div>

      {/* Payment Queue - Pending */}
      {vistaActiva === 'pendientes' && (
      <div className="payment-queue-section">
        <div className="section-header">
          <h3>Cola de Pagos</h3>
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${filtroEstado === 'todos' ? 'active' : ''}`}
              onClick={() => setFiltroEstado('todos')}
            >
              Todos ({solicitudes.length})
            </button>
            <button 
              className={`filter-tab ${filtroEstado === 'aprobado' ? 'active' : ''}`}
              onClick={() => setFiltroEstado('aprobado')}
            >
              Aprobadas ({aprobadas})
            </button>
            <button 
              className={`filter-tab ${filtroEstado === 'ordenado' ? 'active' : ''}`}
              onClick={() => setFiltroEstado('ordenado')}
            >
              Ordenadas ({ordenadas})
            </button>
            <button 
              className={`filter-tab ${filtroEstado === 'recibido' ? 'active' : ''}`}
              onClick={() => setFiltroEstado('recibido')}
            >
              Recibidas ({recibidas})
            </button>
          </div>
        </div>

        {solicitudesFiltradas.length === 0 ? (
          <div className="empty-queue">
            <span className="empty-icon">✨</span>
            <p>No hay solicitudes en esta etapa</p>
          </div>
        ) : (
          <div className="payment-list">
            {solicitudesFiltradas.map(sol => (
              <div key={sol.id} className="payment-card">
                <div className="payment-header">
                  <div className="payment-info">
                    <span className={`estado-badge ${getEstadoBadge(sol.estado)}`}>
                      {getEstadoLabel(sol.estado)}
                    </span>
                    <span className="folio">#{sol.folio}</span>
                  </div>
                  <span className="payment-total">${(sol.total || sol.subtotalEstimado || 0).toLocaleString()}</span>
                </div>
                
                <div className="payment-details">
                  <div className="detail-row">
                    <span className="detail-label">Proyecto</span>
                    <span className="detail-value">{sol.proyectoNombre}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Proveedor</span>
                    <span className="detail-value">{sol.proveedorNombre || 'Sin asignar'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Items</span>
                    <span className="detail-value">{sol.items?.length || 0} artículos</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Solicitado por</span>
                    <span className="detail-value">{sol.solicitadoPor}</span>
                  </div>
                </div>

                <div className="payment-actions">
                  {sol.estado?.toLowerCase() === 'aprobado' && (
                    <>
                      <button className="btn btn-sm" onClick={() => marcarOrdenado(sol)}>
                        📦 Marcar Ordenado
                      </button>
                      <button className="btn btn-sm btn-primary" onClick={() => abrirModalPago(sol)}>
                        💰 Pagar Ahora
                      </button>
                    </>
                  )}
                  {sol.estado?.toLowerCase() === 'ordenado' && (
                    <>
                      <button className="btn btn-sm" onClick={() => marcarRecibido(sol)}>
                        ✅ Marcar Recibido
                      </button>
                      <button className="btn btn-sm btn-primary" onClick={() => abrirModalPago(sol)}>
                        💰 Pagar Ahora
                      </button>
                    </>
                  )}
                  {sol.estado?.toLowerCase() === 'recibido' && (
                    <button className="btn btn-sm btn-primary" onClick={() => abrirModalPago(sol)}>
                      💰 Ejecutar Pago
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Payment History - Paid */}
      {vistaActiva === 'pagados' && (
        <div className="payment-history-section">
          <div className="section-header">
            <h3>Historial de Pagos</h3>
            <div className="total-pagado">
              Total pagado: <strong>${totalPagado.toLocaleString()}</strong>
            </div>
          </div>

          {solicitudesPagadas.length === 0 ? (
            <div className="empty-queue">
              <span className="empty-icon">📋</span>
              <p>No hay pagos registrados aún</p>
            </div>
          ) : (
            <div className="payment-list history">
              {solicitudesPagadas.map(sol => (
                <div key={sol.id} className="payment-card paid">
                  <div className="payment-header">
                    <div className="payment-info">
                      <span className="estado-badge badge-pagado">✓ Pagado</span>
                      <span className="folio">#{sol.folio}</span>
                    </div>
                    <span className="payment-total paid">${(sol.total || sol.subtotalEstimado || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="payment-details">
                    <div className="detail-row">
                      <span className="detail-label">Proyecto</span>
                      <span className="detail-value">{sol.proyectoNombre}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Proveedor</span>
                      <span className="detail-value">{sol.proveedorNombre || 'Sin asignar'}</span>
                    </div>
                    {sol.pago && (
                      <>
                        <div className="detail-row">
                          <span className="detail-label">Método</span>
                          <span className="detail-value">{sol.pago.metodoPago}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Referencia</span>
                          <span className="detail-value">{sol.pago.referencia}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Fecha Pago</span>
                          <span className="detail-value">{sol.pago.fechaPago}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {mostrarModal && solicitudPago && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal payment-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💰 Ejecutar Pago</h2>
              <button className="modal-close" onClick={() => setMostrarModal(false)}>✕</button>
            </div>
            
            <div className="modal-content">
              {/* Payment Summary */}
              <div className="payment-summary">
                <div className="summary-row">
                  <span>Folio</span>
                  <strong>#{solicitudPago.folio}</strong>
                </div>
                <div className="summary-row">
                  <span>Proveedor</span>
                  <strong>{solicitudPago.proveedorNombre || 'N/A'}</strong>
                </div>
                <div className="summary-row">
                  <span>Proyecto</span>
                  <strong>{solicitudPago.proyectoNombre}</strong>
                </div>
                <div className="summary-row total">
                  <span>Total a Pagar</span>
                  <strong>${(solicitudPago.total || solicitudPago.subtotalEstimado || 0).toLocaleString()}</strong>
                </div>
              </div>

              {/* Payment Form */}
              <div className="payment-form">
                <div className="form-group">
                  <label className="label">Cuenta Bancaria *</label>
                  <select
                    className="input"
                    value={formPago.cuentaBancaria}
                    onChange={(e) => setFormPago({ ...formPago, cuentaBancaria: e.target.value })}
                  >
                    <option value="">Seleccionar cuenta...</option>
                    {cuentasBancarias.map(cuenta => (
                      <option key={cuenta.id} value={cuenta.id}>
                        {cuenta.nombre} - ${cuenta.saldo.toLocaleString()} disponible
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Método de Pago</label>
                    <select
                      className="input"
                      value={formPago.metodoPago}
                      onChange={(e) => setFormPago({ ...formPago, metodoPago: e.target.value })}
                    >
                      <option value="transferencia">Transferencia</option>
                      <option value="spei">SPEI</option>
                      <option value="cheque">Cheque</option>
                      <option value="efectivo">Efectivo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Fecha de Pago</label>
                    <input
                      type="date"
                      className="input"
                      value={formPago.fechaPago}
                      onChange={(e) => setFormPago({ ...formPago, fechaPago: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">Referencia</label>
                  <input
                    type="text"
                    className="input"
                    value={formPago.referencia}
                    onChange={(e) => setFormPago({ ...formPago, referencia: e.target.value })}
                    placeholder="Número de referencia"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Notas</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={formPago.notas}
                    onChange={(e) => setFormPago({ ...formPago, notas: e.target.value })}
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => setMostrarModal(false)}>Cancelar</button>
              <button 
                className="btn btn-primary"
                onClick={ejecutarPago}
                disabled={!formPago.cuentaBancaria}
              >
                💰 Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tesoreria
