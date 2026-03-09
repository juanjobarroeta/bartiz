import { useState, useEffect } from 'react'
import './Shared.css'
import { api } from '../config/api'

const Empleados = () => {
  const [empleados, setEmpleados] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: '',
    puesto: '',
    especialidad: '',
    telefono: '',
    salario: '',
    fechaContratacion: ''
  })

  useEffect(() => {
    fetch(api('/api/empleados'))
      .then(res => res.json())
      .then(data => setEmpleados(data))
      .catch(() => {
        setEmpleados([
          { id: 1, nombre: 'Juan Pérez', puesto: 'Ingeniero Civil', especialidad: 'Estructuras', telefono: '555-1001', salario: 45000, fechaContratacion: '2020-03-15' },
          { id: 2, nombre: 'Pedro Martínez', puesto: 'Maestro de Obra', especialidad: 'Albañilería', telefono: '555-1002', salario: 28000, fechaContratacion: '2019-07-20' },
          { id: 3, nombre: 'Laura Hernández', puesto: 'Arquitecta', especialidad: 'Diseño', telefono: '555-1003', salario: 48000, fechaContratacion: '2021-01-10' },
          { id: 4, nombre: 'Miguel Ángel López', puesto: 'Electricista', especialidad: 'Instalaciones', telefono: '555-1004', salario: 32000, fechaContratacion: '2020-09-05' },
          { id: 5, nombre: 'Carmen Ruiz', puesto: 'Supervisora', especialidad: 'Calidad', telefono: '555-1005', salario: 42000, fechaContratacion: '2018-11-22' }
        ])
      })
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const empleado = {
      id: empleados.length + 1,
      ...nuevoEmpleado,
      salario: parseFloat(nuevoEmpleado.salario)
    }

    setEmpleados([...empleados, empleado])
    setNuevoEmpleado({
      nombre: '',
      puesto: '',
      especialidad: '',
      telefono: '',
      salario: '',
      fechaContratacion: ''
    })
    setMostrarFormulario(false)
  }

  const handleChange = (e) => {
    setNuevoEmpleado({
      ...nuevoEmpleado,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Empleados</h1>
          <div className="subtitle">Gestión de personal y recursos humanos</div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Empleado'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="card form-card">
          <h3>Registrar Nuevo Empleado</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label className="label">Nombre Completo</label>
                <input
                  type="text"
                  name="nombre"
                  className="input"
                  value={nuevoEmpleado.nombre}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Puesto</label>
                <input
                  type="text"
                  name="puesto"
                  className="input"
                  value={nuevoEmpleado.puesto}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Especialidad</label>
                <input
                  type="text"
                  name="especialidad"
                  className="input"
                  value={nuevoEmpleado.especialidad}
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
                  value={nuevoEmpleado.telefono}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Salario Mensual ($)</label>
                <input
                  type="number"
                  name="salario"
                  className="input"
                  value={nuevoEmpleado.salario}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Fecha de Contratación</label>
                <input
                  type="date"
                  name="fechaContratacion"
                  className="input"
                  value={nuevoEmpleado.fechaContratacion}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              Registrar Empleado
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Puesto</th>
              <th>Especialidad</th>
              <th>Teléfono</th>
              <th>Salario</th>
              <th>Fecha Contratación</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map(empleado => (
              <tr key={empleado.id}>
                <td><strong>{empleado.nombre}</strong></td>
                <td>{empleado.puesto}</td>
                <td><em>{empleado.especialidad}</em></td>
                <td><code>{empleado.telefono}</code></td>
                <td>${empleado.salario.toLocaleString('es-MX')}</td>
                <td>{new Date(empleado.fechaContratacion).toLocaleDateString('es-MX')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Empleados

