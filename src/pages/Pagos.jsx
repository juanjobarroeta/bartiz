import { useState, useEffect } from 'react'
import './Shared.css'
import { api } from '../config/api'

const Pagos = () => {
  const [pagos, setPagos] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevoPago, setNuevoPago] = useState({
    proyecto: '',
    concepto: '',
    beneficiario: '',
    proveedorId: '',
    monto: '',
    metodoPago: 'transferencia',
    referencia: '',
    fechaPago: new Date().toISOString().split('T')[0],
    categoria: 'materiales'
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

    // Cargar pagos
    fetch(api('/api/pagos'))
      .then(res => res.json())
      .then(data => setPagos(data))
      .catch(() => {
        setPagos([
          { 
            id: 1, 
            proyecto: 'Torre Corporativa Centro', 
            concepto: 'Compra de cemento y agregados', 
            beneficiario: 'Materiales del Norte SA',
            monto: 125000,
            metodoPago: 'transferencia',
            referencia: 'TRANS-001-2024',
            fechaPago: '2024-11-15',
            categoria: 'materiales',
            estado: 'pagado'
          },
          { 
            id: 2, 
            proyecto: 'Plaza Comercial Zona Norte', 
            concepto: 'Nómina semanal equipo de obra', 
            beneficiario: 'Equipo de Construcción',
            monto: 45000,
            metodoPago: 'transferencia',
            referencia: 'NOM-W47-2024',
            fechaPago: '2024-11-18',
            categoria: 'nomina',
            estado: 'pagado'
          },
          { 
            id: 3, 
            proyecto: 'Residencial Los Pinos', 
            concepto: 'Renta de maquinaria pesada', 
            beneficiario: 'Renta Equipos MX',
            monto: 85000,
            metodoPago: 'cheque',
            referencia: 'CHK-2341',
            fechaPago: '2024-11-22',
            categoria: 'equipos',
            estado: 'pendiente'
          },
          { 
            id: 4, 
            proyecto: 'Nave Industrial Parque Tech', 
            concepto: 'Servicios de ingeniería estructural', 
            beneficiario: 'Consultores Asociados',
            monto: 95000,
            metodoPago: 'transferencia',
            referencia: 'TRANS-045-2024',
            fechaPago: '2024-11-10',
            categoria: 'servicios',
            estado: 'pagado'
          },
          { 
            id: 5, 
            proyecto: 'Ampliación Hospital Regional', 
            concepto: 'Anticipo a proveedor de block', 
            beneficiario: 'Blocks y Tabiques SA',
            monto: 65000,
            metodoPago: 'transferencia',
            referencia: 'TRANS-052-2024',
            fechaPago: '2024-11-25',
            categoria: 'materiales',
            estado: 'programado'
          }
        ])
      })
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const pago = {
      id: pagos.length + 1,
      ...nuevoPago,
      monto: parseFloat(nuevoPago.monto),
      estado: 'pendiente'
    }

    setPagos([...pagos, pago])
    setNuevoPago({
      proyecto: '',
      concepto: '',
      beneficiario: '',
      proveedorId: '',
      monto: '',
      metodoPago: 'transferencia',
      referencia: '',
      fechaPago: new Date().toISOString().split('T')[0],
      categoria: 'materiales'
    })
    setMostrarFormulario(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Si se selecciona un proveedor, auto-llenar el beneficiario
    if (name === 'proveedorId' && value) {
      const proveedor = proveedores.find(p => p.id === parseInt(value))
      if (proveedor) {
        setNuevoPago({
          ...nuevoPago,
          proveedorId: value,
          beneficiario: proveedor.nombre
        })
        return
      }
    }
    
    setNuevoPago({
      ...nuevoPago,
      [name]: value
    })
  }

  const getEstadoBadgeClass = (estado) => {
    switch(estado) {
      case 'pagado': return 'badge-black'
      case 'pendiente': return 'badge-beige'
      case 'programado': return 'badge-gray'
      case 'cancelado': return 'badge-white'
      default: return 'badge-gray'
    }
  }

  const getCategoriaBadgeClass = (categoria) => {
    switch(categoria) {
      case 'materiales': return 'badge-gray'
      case 'nomina': return 'badge-beige'
      case 'equipos': return 'badge-white'
      case 'servicios': return 'badge-gray'
      default: return 'badge-gray'
    }
  }

  // Calcular totales
  const totalPagado = pagos.filter(p => p.estado === 'pagado').reduce((sum, p) => sum + p.monto, 0)
  const totalPendiente = pagos.filter(p => p.estado === 'pendiente').reduce((sum, p) => sum + p.monto, 0)
  const totalProgramado = pagos.filter(p => p.estado === 'programado').reduce((sum, p) => sum + p.monto, 0)

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Pagos</h1>
          <div className="subtitle">Control de pagos y transacciones</div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Pago'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Pagado</div>
          <div className="stat-value">${totalPagado.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card">
          <div className="label">Pendiente</div>
          <div className="stat-value">${totalPendiente.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card stat-card-highlight">
          <div className="label">Programado</div>
          <div className="stat-value">${totalProgramado.toLocaleString('es-MX')}</div>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="card form-card">
          <h3>Registrar Nuevo Pago</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label className="label">Proyecto</label>
                <select
                  name="proyecto"
                  className="input"
                  value={nuevoPago.proyecto}
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
                <label className="label">Proveedor</label>
                <select
                  name="proveedorId"
                  className="input"
                  value={nuevoPago.proveedorId}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar proveedor (opcional)...</option>
                  {proveedores
                    .filter(p => p.activo)
                    .map(proveedor => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre} - {proveedor.categoria}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Beneficiario</label>
              <input
                type="text"
                name="beneficiario"
                className="input"
                value={nuevoPago.beneficiario}
                onChange={handleChange}
                placeholder="Nombre del beneficiario (auto-completa con proveedor)"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Concepto</label>
              <input
                type="text"
                name="concepto"
                className="input"
                value={nuevoPago.concepto}
                onChange={handleChange}
                placeholder="Descripción del pago"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Monto</label>
                <input
                  type="number"
                  name="monto"
                  className="input"
                  value={nuevoPago.monto}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Método de Pago</label>
                <select
                  name="metodoPago"
                  className="input"
                  value={nuevoPago.metodoPago}
                  onChange={handleChange}
                  required
                >
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Categoría</label>
                <select
                  name="categoria"
                  className="input"
                  value={nuevoPago.categoria}
                  onChange={handleChange}
                  required
                >
                  <option value="materiales">Materiales</option>
                  <option value="nomina">Nómina</option>
                  <option value="equipos">Equipos</option>
                  <option value="servicios">Servicios</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Referencia</label>
                <input
                  type="text"
                  name="referencia"
                  className="input"
                  value={nuevoPago.referencia}
                  onChange={handleChange}
                  placeholder="Número de referencia"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Fecha de Pago</label>
              <input
                type="date"
                name="fechaPago"
                className="input"
                value={nuevoPago.fechaPago}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Registrar Pago
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proyecto</th>
              <th>Concepto</th>
              <th>Beneficiario</th>
              <th>Categoría</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Referencia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map(pago => (
              <tr key={pago.id}>
                <td>{new Date(pago.fechaPago).toLocaleDateString('es-MX')}</td>
                <td><strong>{pago.proyecto}</strong></td>
                <td>{pago.concepto}</td>
                <td><em>{pago.beneficiario}</em></td>
                <td>
                  <span className={`badge ${getCategoriaBadgeClass(pago.categoria)}`}>
                    {pago.categoria.charAt(0).toUpperCase() + pago.categoria.slice(1)}
                  </span>
                </td>
                <td><strong>${pago.monto.toLocaleString('es-MX')}</strong></td>
                <td><code>{pago.metodoPago}</code></td>
                <td><code>{pago.referencia}</code></td>
                <td>
                  <span className={`badge ${getEstadoBadgeClass(pago.estado)}`}>
                    {pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1)}
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

export default Pagos

