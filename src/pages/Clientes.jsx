import { useState, useEffect } from 'react'
import './Shared.css'

const Clientes = () => {
  const [clientes, setClientes] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    empresa: '',
    email: '',
    telefono: '',
    direccion: ''
  })

  useEffect(() => {
    fetch('/api/clientes')
      .then(res => res.json())
      .then(data => setClientes(data))
      .catch(() => {
        setClientes([
          { id: 1, nombre: 'Carlos Méndez', empresa: 'Inmobiliaria Del Valle', email: 'carlos@delvalle.com', telefono: '555-0101', direccion: 'Av. Reforma 123, CDMX' },
          { id: 2, nombre: 'Ana Torres', empresa: 'Grupo Comercial MX', email: 'ana.torres@comercialmx.com', telefono: '555-0202', direccion: 'Blvd. Constitución 456, MTY' },
          { id: 3, nombre: 'Roberto Sánchez', empresa: 'TechCorp', email: 'roberto@techcorp.com', telefono: '555-0303', direccion: 'Av. Patria 789, GDL' },
          { id: 4, nombre: 'María González', empresa: 'Municipio Sur', email: 'mgonzalez@municipio.gob', telefono: '555-0404', direccion: 'Plaza Principal 1, Puebla' },
          { id: 5, nombre: 'Luis Ramírez', empresa: 'Hoteles Premier', email: 'luis.ramirez@premier.com', telefono: '555-0505', direccion: 'Zona Hotelera Km 8, Cancún' }
        ])
      })
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const cliente = {
      id: clientes.length + 1,
      ...nuevoCliente
    }

    setClientes([...clientes, cliente])
    setNuevoCliente({
      nombre: '',
      empresa: '',
      email: '',
      telefono: '',
      direccion: ''
    })
    setMostrarFormulario(false)
  }

  const handleChange = (e) => {
    setNuevoCliente({
      ...nuevoCliente,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <div className="subtitle">Gestión de clientes y contactos</div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Cliente'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="card form-card">
          <h3>Registrar Nuevo Cliente</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label className="label">Nombre Completo</label>
                <input
                  type="text"
                  name="nombre"
                  className="input"
                  value={nuevoCliente.nombre}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Empresa</label>
                <input
                  type="text"
                  name="empresa"
                  className="input"
                  value={nuevoCliente.empresa}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="input"
                  value={nuevoCliente.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Teléfono</label>
                <input
                  type="tel"
                  name="telefono"
                  className="input"
                  value={nuevoCliente.telefono}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Dirección</label>
              <input
                type="text"
                name="direccion"
                className="input"
                value={nuevoCliente.direccion}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Registrar Cliente
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Empresa</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Dirección</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(cliente => (
              <tr key={cliente.id}>
                <td><strong>{cliente.nombre}</strong></td>
                <td>{cliente.empresa}</td>
                <td>{cliente.email}</td>
                <td><code>{cliente.telefono}</code></td>
                <td>{cliente.direccion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Clientes

