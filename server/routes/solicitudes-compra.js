import { Router } from 'express'
import { 
  obtenerSolicitudes, 
  obtenerSolicitud, 
  crearSolicitud, 
  actualizarSolicitud,
  cambiarEstado,
  obtenerPlantillas,
  obtenerPlantilla,
  obtenerEstadisticas,
  estadosSolicitud,
  fases
} from '../data/solicitudes-compra.js'

const router = Router()

// GET /api/solicitudes-compra/estados - Lista de estados
router.get('/estados', (req, res) => {
  res.json(estadosSolicitud)
})

// GET /api/solicitudes-compra/fases - Lista de fases
router.get('/fases', (req, res) => {
  res.json(fases)
})

// GET /api/solicitudes-compra/plantillas - Lista de plantillas
router.get('/plantillas', (req, res) => {
  res.json(obtenerPlantillas())
})

// GET /api/solicitudes-compra/plantillas/:id - Obtener plantilla
router.get('/plantillas/:id', (req, res) => {
  const plantilla = obtenerPlantilla(parseInt(req.params.id))
  if (!plantilla) {
    return res.status(404).json({ error: 'Plantilla no encontrada' })
  }
  res.json(plantilla)
})

// GET /api/solicitudes-compra/estadisticas - Estadísticas
router.get('/estadisticas', (req, res) => {
  const { proyectoId } = req.query
  const stats = obtenerEstadisticas(proyectoId ? parseInt(proyectoId) : null)
  res.json(stats)
})

// GET /api/solicitudes-compra - Listar solicitudes
router.get('/', (req, res) => {
  const { proyectoId, fase, estado, proveedorId } = req.query
  
  const filtros = {}
  if (proyectoId) filtros.proyectoId = parseInt(proyectoId)
  if (fase) filtros.fase = fase
  if (estado) filtros.estado = estado
  if (proveedorId) filtros.proveedorId = parseInt(proveedorId)
  
  const solicitudes = obtenerSolicitudes(filtros)
  res.json(solicitudes)
})

// GET /api/solicitudes-compra/:id - Obtener solicitud
router.get('/:id', (req, res) => {
  const solicitud = obtenerSolicitud(parseInt(req.params.id))
  if (!solicitud) {
    return res.status(404).json({ error: 'Solicitud no encontrada' })
  }
  res.json(solicitud)
})

// POST /api/solicitudes-compra - Crear solicitud
router.post('/', (req, res) => {
  const { proyectoId, proyectoNombre, fase, proveedorId, proveedorNombre, items, notas, solicitadoPor, solicitadoPorRol } = req.body
  
  if (!proyectoId || !fase) {
    return res.status(400).json({ error: 'Proyecto y fase son requeridos' })
  }
  
  const nueva = crearSolicitud({
    proyectoId,
    proyectoNombre,
    fase,
    proveedorId,
    proveedorNombre,
    items,
    notas,
    solicitadoPor,
    solicitadoPorRol
  })
  
  res.status(201).json(nueva)
})

// PUT /api/solicitudes-compra/:id - Actualizar solicitud
router.put('/:id', (req, res) => {
  const solicitud = actualizarSolicitud(parseInt(req.params.id), req.body)
  if (!solicitud) {
    return res.status(404).json({ error: 'Solicitud no encontrada' })
  }
  res.json(solicitud)
})

// POST /api/solicitudes-compra/:id/estado - Cambiar estado
router.post('/:id/estado', (req, res) => {
  const { estado, usuario, comentario } = req.body
  
  if (!estado || !usuario) {
    return res.status(400).json({ error: 'Estado y usuario son requeridos' })
  }
  
  // Validar estado
  const estadoValido = estadosSolicitud.find(e => e.id === estado)
  if (!estadoValido) {
    return res.status(400).json({ error: 'Estado inválido' })
  }
  
  const solicitud = cambiarEstado(parseInt(req.params.id), estado, usuario, comentario)
  if (!solicitud) {
    return res.status(404).json({ error: 'Solicitud no encontrada' })
  }
  
  res.json(solicitud)
})

// PUT /api/solicitudes-compra/:id/estado - Actualizar estado (for Tesoreria)
router.put('/:id/estado', (req, res) => {
  const { estado, pago } = req.body
  
  if (!estado) {
    return res.status(400).json({ error: 'Estado es requerido' })
  }
  
  const solicitud = obtenerSolicitud(parseInt(req.params.id))
  if (!solicitud) {
    return res.status(404).json({ error: 'Solicitud no encontrada' })
  }
  
  // Update the status and optionally add payment info
  const actualizada = actualizarSolicitud(solicitud.id, { 
    estado,
    ...(pago && { pago })
  })
  
  res.json(actualizada)
})

// POST /api/solicitudes-compra/:id/enviar - Enviar para aprobación
router.post('/:id/enviar', (req, res) => {
  const { usuario } = req.body
  const solicitud = obtenerSolicitud(parseInt(req.params.id))
  
  if (!solicitud) {
    return res.status(404).json({ error: 'Solicitud no encontrada' })
  }
  
  if (solicitud.estado !== 'borrador') {
    return res.status(400).json({ error: 'Solo se pueden enviar solicitudes en borrador' })
  }
  
  if (!solicitud.proveedorId) {
    return res.status(400).json({ error: 'Debe seleccionar un proveedor antes de enviar' })
  }
  
  if (!solicitud.items || solicitud.items.length === 0) {
    return res.status(400).json({ error: 'Debe agregar al menos un artículo' })
  }
  
  const actualizada = cambiarEstado(solicitud.id, 'solicitado', usuario || 'Usuario')
  res.json(actualizada)
})

// POST /api/solicitudes-compra/:id/aprobar - Aprobar solicitud
router.post('/:id/aprobar', (req, res) => {
  const { usuario, comentario } = req.body
  const solicitud = obtenerSolicitud(parseInt(req.params.id))
  
  if (!solicitud) {
    return res.status(404).json({ error: 'Solicitud no encontrada' })
  }
  
  if (solicitud.estado !== 'solicitado') {
    return res.status(400).json({ error: 'Solo se pueden aprobar solicitudes enviadas' })
  }
  
  const actualizada = cambiarEstado(solicitud.id, 'aprobado', usuario || 'Manager', comentario)
  res.json(actualizada)
})

// POST /api/solicitudes-compra/:id/rechazar - Rechazar solicitud
router.post('/:id/rechazar', (req, res) => {
  const { usuario, comentario } = req.body
  const solicitud = obtenerSolicitud(parseInt(req.params.id))
  
  if (!solicitud) {
    return res.status(404).json({ error: 'Solicitud no encontrada' })
  }
  
  if (solicitud.estado !== 'solicitado') {
    return res.status(400).json({ error: 'Solo se pueden rechazar solicitudes enviadas' })
  }
  
  if (!comentario) {
    return res.status(400).json({ error: 'Debe proporcionar un motivo de rechazo' })
  }
  
  const actualizada = cambiarEstado(solicitud.id, 'rechazado', usuario || 'Manager', comentario)
  res.json(actualizada)
})

export default router

