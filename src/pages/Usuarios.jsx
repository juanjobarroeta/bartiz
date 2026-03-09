import { useState, useEffect } from 'react'
import './Usuarios.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [usuarioForm, setUsuarioForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    rol: '',
    departamento: '',
    estado: 'activo'
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const [usuariosRes, rolesRes] = await Promise.all([
        fetch(`${API_URL}/api/usuarios`),
        fetch(`${API_URL}/api/usuarios/roles`)
      ])
      setUsuarios(await usuariosRes.json())
      setRoles(await rolesRes.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const abrirModalCrear = () => {
    setModoEdicion(false)
    setUsuarioForm({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      rol: '',
      departamento: '',
      estado: 'activo'
    })
    setMostrarModal(true)
  }

  const abrirModalEditar = (usuario) => {
    setModoEdicion(true)
    setUsuarioForm(usuario)
    setMostrarModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const url = modoEdicion ? `${API_URL}/api/usuarios/${usuarioForm.id}` : `${API_URL}/api/usuarios`
      const method = modoEdicion ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuarioForm)
      })

      if (res.ok) {
        await cargarDatos()
        setMostrarModal(false)
      } else {
        const error = await res.json()
        alert(error.error || 'Error al guardar usuario')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar usuario')
    }
  }

  const desactivarUsuario = async (id) => {
    if (!confirm('¿Desactivar este usuario?')) return

    try {
      const res = await fetch(`${API_URL}/api/usuarios/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await cargarDatos()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const reactivarUsuario = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/usuarios/${id}/reactivar`, { method: 'POST' })
      if (res.ok) {
        await cargarDatos()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const usuariosFiltrados = usuarios.filter(u => {
    if (filtroEstado !== 'todos' && u.estado !== filtroEstado) return false
    if (filtroRol !== 'todos' && u.rol !== filtroRol) return false
    return true
  })

  const getRolNombre = (rolId) => {
    const rol = roles.find(r => r.id === rolId)
    return rol ? rol.nombre : rolId
  }

  const getRolColor = (rolId) => {
    const colores = {
      admin: '#d32f2f',
      gerente_proyecto: '#1976d2',
      tesorero: '#388e3c',
      contador: '#f57c00',
      comprador: '#7b1fa2',
      almacenista: '#0097a7',
      residente_obra: '#5d4037',
      auxiliar: '#616161'
    }
    return colores[rolId] || '#757575'
  }

  if (loading) {
    return <div className="loading">Cargando usuarios...</div>
  }

  const usuariosActivos = usuarios.filter(u => u.estado === 'activo').length
  const usuariosInactivos = usuarios.filter(u => u.estado === 'inactivo').length

  return (
    <div className="usuarios-page">
      <header className="page-header-bar">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p className="subtitle">Administra los usuarios y sus roles del sistema</p>
        </div>
        <button className="btn btn-primary" onClick={abrirModalCrear}>
          + Nuevo Usuario
        </button>
      </header>

      {/* Stats */}
      <div className="usuarios-stats">
        <div className="stat">
          <span className="stat-value">{usuarios.length}</span>
          <span className="stat-label">Total Usuarios</span>
        </div>
        <div className="stat">
          <span className="stat-value" style={{ color: '#4caf50' }}>{usuariosActivos}</span>
          <span className="stat-label">Activos</span>
        </div>
        <div className="stat">
          <span className="stat-value" style={{ color: '#f44336' }}>{usuariosInactivos}</span>
          <span className="stat-label">Inactivos</span>
        </div>
        <div className="stat">
          <span className="stat-value">{roles.length}</span>
          <span className="stat-label">Roles</span>
        </div>
      </div>

      {/* Filters */}
      <div className="usuarios-filters">
        <div className="filter-group">
          <label>Estado:</label>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Rol:</label>
          <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
            <option value="todos">Todos los roles</option>
            {roles.map(rol => (
              <option key={rol.id} value={rol.id}>{rol.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Grid */}
      <div className="usuarios-grid">
        {usuariosFiltrados.map(usuario => (
          <div key={usuario.id} className={`usuario-card ${usuario.estado}`}>
            <div className="usuario-header">
              <div className="usuario-avatar">
                {usuario.nombre[0]}{usuario.apellido[0]}
              </div>
              <div className="usuario-info">
                <h3>{usuario.nombre} {usuario.apellido}</h3>
                <p className="usuario-email">{usuario.email}</p>
              </div>
              <span 
                className="usuario-rol-badge"
                style={{ background: getRolColor(usuario.rol) }}
              >
                {getRolNombre(usuario.rol)}
              </span>
            </div>

            <div className="usuario-details">
              <div className="detail-row">
                <span className="detail-label">📞 Teléfono:</span>
                <span className="detail-value">{usuario.telefono}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">🏢 Departamento:</span>
                <span className="detail-value">{usuario.departamento}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">📅 Ingreso:</span>
                <span className="detail-value">
                  {new Date(usuario.fechaIngreso).toLocaleDateString('es-MX')}
                </span>
              </div>
              {usuario.fechaSalida && (
                <div className="detail-row">
                  <span className="detail-label">📅 Salida:</span>
                  <span className="detail-value">
                    {new Date(usuario.fechaSalida).toLocaleDateString('es-MX')}
                  </span>
                </div>
              )}
            </div>

            <div className="usuario-permisos">
              <span className="permisos-label">Permisos:</span>
              <div className="permisos-tags">
                {usuario.permisos.map((permiso, idx) => (
                  <span key={idx} className="permiso-tag">{permiso}</span>
                ))}
              </div>
            </div>

            <div className="usuario-actions">
              <button 
                className="btn btn-sm"
                onClick={() => abrirModalEditar(usuario)}
              >
                Editar
              </button>
              {usuario.estado === 'activo' ? (
                <button 
                  className="btn btn-sm btn-danger"
                  onClick={() => desactivarUsuario(usuario.id)}
                >
                  Desactivar
                </button>
              ) : (
                <button 
                  className="btn btn-sm btn-success"
                  onClick={() => reactivarUsuario(usuario.id)}
                >
                  Reactivar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {usuariosFiltrados.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No se encontraron usuarios</h3>
          <p>No hay usuarios que coincidan con los filtros seleccionados</p>
        </div>
      )}

      {/* Modal */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modoEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button className="modal-close" onClick={() => setMostrarModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-content">
                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Nombre *</label>
                    <input
                      type="text"
                      className="input"
                      value={usuarioForm.nombre}
                      onChange={(e) => setUsuarioForm({...usuarioForm, nombre: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Apellido *</label>
                    <input
                      type="text"
                      className="input"
                      value={usuarioForm.apellido}
                      onChange={(e) => setUsuarioForm({...usuarioForm, apellido: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Email *</label>
                    <input
                      type="email"
                      className="input"
                      value={usuarioForm.email}
                      onChange={(e) => setUsuarioForm({...usuarioForm, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Teléfono *</label>
                    <input
                      type="tel"
                      className="input"
                      value={usuarioForm.telefono}
                      onChange={(e) => setUsuarioForm({...usuarioForm, telefono: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Rol *</label>
                    <select
                      className="input"
                      value={usuarioForm.rol}
                      onChange={(e) => setUsuarioForm({...usuarioForm, rol: e.target.value})}
                      required
                    >
                      <option value="">Seleccionar rol...</option>
                      {roles.map(rol => (
                        <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                      ))}
                    </select>
                    {usuarioForm.rol && (
                      <small style={{ color: '#666', fontSize: '12px' }}>
                        {roles.find(r => r.id === usuarioForm.rol)?.descripcion}
                      </small>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="label">Departamento *</label>
                    <input
                      type="text"
                      className="input"
                      value={usuarioForm.departamento}
                      onChange={(e) => setUsuarioForm({...usuarioForm, departamento: e.target.value})}
                      required
                    />
                  </div>
                </div>

                {modoEdicion && (
                  <div className="form-group">
                    <label className="label">Estado</label>
                    <select
                      className="input"
                      value={usuarioForm.estado}
                      onChange={(e) => setUsuarioForm({...usuarioForm, estado: e.target.value})}
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setMostrarModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {modoEdicion ? 'Actualizar' : 'Crear'} Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Usuarios
