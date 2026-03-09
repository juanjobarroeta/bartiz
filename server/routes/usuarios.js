import express from 'express'
import usuarios, { getRoles } from '../data/usuarios.js'

const router = express.Router()

// Get all users
router.get('/', (req, res) => {
  res.json(usuarios)
})

// Get roles
router.get('/roles', (req, res) => {
  res.json(getRoles())
})

// Get active users only
router.get('/activos', (req, res) => {
  const activos = usuarios.filter(u => u.estado === 'activo')
  res.json(activos)
})

// Get users by role
router.get('/rol/:rol', (req, res) => {
  const { rol } = req.params
  const usuariosRol = usuarios.filter(u => u.rol === rol)
  res.json(usuariosRol)
})

// Get single user
router.get('/:id', (req, res) => {
  const usuario = usuarios.find(u => u.id === parseInt(req.params.id))
  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }
  res.json(usuario)
})

// Create user
router.post('/', (req, res) => {
  const { email } = req.body
  
  // Check if email already exists
  if (usuarios.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'El correo electrónico ya está registrado' })
  }

  const nuevoUsuario = {
    id: usuarios.length > 0 ? Math.max(...usuarios.map(u => u.id)) + 1 : 1,
    ...req.body,
    estado: req.body.estado || 'activo',
    fechaIngreso: req.body.fechaIngreso || new Date().toISOString().split('T')[0],
    avatar: req.body.avatar || null
  }
  
  // Set default permissions based on role
  if (!nuevoUsuario.permisos) {
    const roles = getRoles()
    const rolInfo = roles.find(r => r.id === nuevoUsuario.rol)
    nuevoUsuario.permisos = rolInfo ? rolInfo.permisos : []
  }
  
  usuarios.push(nuevoUsuario)
  res.status(201).json(nuevoUsuario)
})

// Update user
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const index = usuarios.findIndex(u => u.id === id)
  
  if (index === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  // If email is being changed, check for duplicates
  if (req.body.email && req.body.email !== usuarios[index].email) {
    if (usuarios.some(u => u.id !== id && u.email.toLowerCase() === req.body.email.toLowerCase())) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' })
    }
  }

  usuarios[index] = { ...usuarios[index], ...req.body }
  
  // Update permissions if role changed
  if (req.body.rol && !req.body.permisos) {
    const roles = getRoles()
    const rolInfo = roles.find(r => r.id === req.body.rol)
    if (rolInfo) {
      usuarios[index].permisos = rolInfo.permisos
    }
  }
  
  res.json(usuarios[index])
})

// Delete user (soft delete - mark as inactive)
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const index = usuarios.findIndex(u => u.id === id)
  
  if (index === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  // Soft delete
  usuarios[index].estado = 'inactivo'
  usuarios[index].fechaSalida = new Date().toISOString().split('T')[0]
  
  res.json({ message: 'Usuario desactivado correctamente', usuario: usuarios[index] })
})

// Reactivate user
router.post('/:id/reactivar', (req, res) => {
  const id = parseInt(req.params.id)
  const index = usuarios.findIndex(u => u.id === id)
  
  if (index === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  usuarios[index].estado = 'activo'
  delete usuarios[index].fechaSalida
  
  res.json({ message: 'Usuario reactivado correctamente', usuario: usuarios[index] })
})

export default router
