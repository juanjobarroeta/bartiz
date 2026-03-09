import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Shared.css'

const Proveedores = () => {
  const navigate = useNavigate()
  const [proveedores, setProveedores] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevoProveedor, setNuevoProveedor] = useState({
    nombre: '',
    razonSocial: '',
    rfc: '',
    categoria: 'materiales',
    contacto: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    codigoPostal: '',
    condicionesPago: '30 días',
    creditoDisponible: 0,
    calificacion: 3,
    notas: ''
  })

  useEffect(() => {
    fetch('/api/proveedores')
      .then(res => res.json())
      .then(data => setProveedores(data))
      .catch(() => {
        setProveedores([
          {
            id: 1,
            nombre: 'Materiales del Norte SA',
            razonSocial: 'Materiales del Norte SA de CV',
            rfc: 'MDN890123ABC',
            categoria: 'materiales',
            contacto: 'Ing. Roberto Castillo',
            email: 'ventas@materialesdelnorte.com',
            telefono: '555-1001',
            ciudad: 'Monterrey, NL',
            condicionesPago: '30 días',
            creditoDisponible: 500000,
            saldoPendiente: 125000,
            calificacion: 5,
            activo: true
          }
        ])
      })
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const proveedor = {
      id: proveedores.length + 1,
      ...nuevoProveedor,
      creditoDisponible: parseFloat(nuevoProveedor.creditoDisponible),
      calificacion: parseInt(nuevoProveedor.calificacion),
      saldoPendiente: 0,
      activo: true
    }

    setProveedores([...proveedores, proveedor])
    setNuevoProveedor({
      nombre: '',
      razonSocial: '',
      rfc: '',
      categoria: 'materiales',
      contacto: '',
      email: '',
      telefono: '',
      direccion: '',
      ciudad: '',
      codigoPostal: '',
      condicionesPago: '30 días',
      creditoDisponible: 0,
      calificacion: 3,
      notas: ''
    })
    setMostrarFormulario(false)
  }

  const handleChange = (e) => {
    setNuevoProveedor({
      ...nuevoProveedor,
      [e.target.name]: e.target.value
    })
  }

  const getCategoriaBadgeClass = (categoria) => {
    switch(categoria) {
      case 'materiales': return 'badge-gray'
      case 'equipos': return 'badge-beige'
      case 'servicios': return 'badge-white'
      default: return 'badge-gray'
    }
  }

  const getCalificacionStars = (calificacion) => {
    return '★'.repeat(calificacion) + '☆'.repeat(5 - calificacion)
  }

  // Calcular totales
  const totalProveedores = proveedores.length
  const proveedoresActivos = proveedores.filter(p => p.activo).length
  const creditoTotal = proveedores.reduce((sum, p) => sum + (p.creditoDisponible || 0), 0)
  const saldoTotal = proveedores.reduce((sum, p) => sum + (p.saldoPendiente || 0), 0)

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Proveedores</h1>
          <div className="subtitle">Gestión de proveedores y suppliers</div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Proveedor'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Proveedores</div>
          <div className="stat-value">{totalProveedores}</div>
        </div>
        <div className="stat-card">
          <div className="label">Activos</div>
          <div className="stat-value">{proveedoresActivos}</div>
        </div>
        <div className="stat-card">
          <div className="label">Crédito Disponible</div>
          <div className="stat-value">${creditoTotal.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card stat-card-highlight">
          <div className="label">Saldo Pendiente</div>
          <div className="stat-value">${saldoTotal.toLocaleString('es-MX')}</div>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="card form-card">
          <h3>Registrar Nuevo Proveedor</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label className="label">Nombre Comercial</label>
                <input
                  type="text"
                  name="nombre"
                  className="input"
                  value={nuevoProveedor.nombre}
                  onChange={handleChange}
                  placeholder="ej: Materiales del Norte"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Razón Social</label>
                <input
                  type="text"
                  name="razonSocial"
                  className="input"
                  value={nuevoProveedor.razonSocial}
                  onChange={handleChange}
                  placeholder="ej: Materiales del Norte SA de CV"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">RFC</label>
                <input
                  type="text"
                  name="rfc"
                  className="input"
                  value={nuevoProveedor.rfc}
                  onChange={handleChange}
                  placeholder="ej: ABC123456XYZ"
                  maxLength="13"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Categoría</label>
                <select
                  name="categoria"
                  className="input"
                  value={nuevoProveedor.categoria}
                  onChange={handleChange}
                  required
                >
                  <option value="materiales">Materiales</option>
                  <option value="equipos">Equipos</option>
                  <option value="servicios">Servicios</option>
                  <option value="subcontratista">Subcontratista</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Contacto Principal</label>
                <input
                  type="text"
                  name="contacto"
                  className="input"
                  value={nuevoProveedor.contacto}
                  onChange={handleChange}
                  placeholder="ej: Ing. Juan Pérez"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="input"
                  value={nuevoProveedor.email}
                  onChange={handleChange}
                  placeholder="contacto@proveedor.com"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Teléfono</label>
                <input
                  type="tel"
                  name="telefono"
                  className="input"
                  value={nuevoProveedor.telefono}
                  onChange={handleChange}
                  placeholder="555-1234"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Ciudad</label>
                <input
                  type="text"
                  name="ciudad"
                  className="input"
                  value={nuevoProveedor.ciudad}
                  onChange={handleChange}
                  placeholder="ej: Monterrey, NL"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  className="input"
                  value={nuevoProveedor.direccion}
                  onChange={handleChange}
                  placeholder="Calle y número"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Código Postal</label>
                <input
                  type="text"
                  name="codigoPostal"
                  className="input"
                  value={nuevoProveedor.codigoPostal}
                  onChange={handleChange}
                  placeholder="64000"
                  maxLength="5"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Condiciones de Pago</label>
                <select
                  name="condicionesPago"
                  className="input"
                  value={nuevoProveedor.condicionesPago}
                  onChange={handleChange}
                  required
                >
                  <option value="Contado">Contado</option>
                  <option value="15 días">15 días</option>
                  <option value="30 días">30 días</option>
                  <option value="45 días">45 días</option>
                  <option value="60 días">60 días</option>
                  <option value="90 días">90 días</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Crédito Disponible</label>
                <input
                  type="number"
                  name="creditoDisponible"
                  className="input"
                  value={nuevoProveedor.creditoDisponible}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Calificación (1-5 estrellas)</label>
              <select
                name="calificacion"
                className="input"
                value={nuevoProveedor.calificacion}
                onChange={handleChange}
                required
              >
                <option value="1">★ - Muy Baja</option>
                <option value="2">★★ - Baja</option>
                <option value="3">★★★ - Media</option>
                <option value="4">★★★★ - Buena</option>
                <option value="5">★★★★★ - Excelente</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Notas</label>
              <textarea
                name="notas"
                className="input"
                value={nuevoProveedor.notas}
                onChange={handleChange}
                rows="3"
                placeholder="Notas adicionales sobre el proveedor..."
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Registrar Proveedor
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>RFC</th>
              <th>Contacto</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Ciudad</th>
              <th>Condiciones</th>
              <th>Crédito</th>
              <th>Saldo</th>
              <th>Calificación</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map(proveedor => (
              <tr 
                key={proveedor.id}
                onClick={() => navigate(`/proveedores/${proveedor.id}`)}
                className="proyecto-row"
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <strong>{proveedor.nombre}</strong>
                  {!proveedor.activo && <span style={{ color: 'var(--color-gray)', marginLeft: '0.5rem' }}>(Inactivo)</span>}
                </td>
                <td>
                  <span className={`badge ${getCategoriaBadgeClass(proveedor.categoria)}`}>
                    {proveedor.categoria.charAt(0).toUpperCase() + proveedor.categoria.slice(1)}
                  </span>
                </td>
                <td><code>{proveedor.rfc}</code></td>
                <td><em>{proveedor.contacto}</em></td>
                <td>{proveedor.email}</td>
                <td><code>{proveedor.telefono}</code></td>
                <td>{proveedor.ciudad}</td>
                <td><code>{proveedor.condicionesPago}</code></td>
                <td>${(proveedor.creditoDisponible || 0).toLocaleString('es-MX')}</td>
                <td>
                  <strong style={{ color: proveedor.saldoPendiente > 0 ? 'var(--color-black)' : 'var(--color-gray)' }}>
                    ${(proveedor.saldoPendiente || 0).toLocaleString('es-MX')}
                  </strong>
                </td>
                <td>
                  <span style={{ color: 'var(--color-beige)', fontSize: '0.875rem' }}>
                    {getCalificacionStars(proveedor.calificacion)}
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

export default Proveedores

