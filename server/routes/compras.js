import { Router } from 'express'
import { 
  obtenerCompras, 
  obtenerCompra, 
  crearCompra, 
  actualizarCompra,
  compararPrecios,
  obtenerHistorialPrecios
} from '../data/compras.js'
import { proveedores } from '../data/proveedores.js'

const router = Router()

// GET /api/compras - Listar compras
router.get('/', (req, res) => {
  const { proveedorId, estado, desde, hasta } = req.query
  
  const filtros = {}
  if (proveedorId) filtros.proveedorId = parseInt(proveedorId)
  if (estado) filtros.estado = estado
  if (desde) filtros.desde = desde
  if (hasta) filtros.hasta = hasta
  
  const resultado = obtenerCompras(filtros)
  res.json(resultado)
})

// GET /api/compras/precios/:articuloId - Comparar precios de un artículo
router.get('/precios/:articuloId', (req, res) => {
  const articuloId = parseInt(req.params.articuloId)
  const precios = compararPrecios(articuloId)
  
  // Enriquecer con nombres de proveedores
  const resultado = precios.map(p => {
    const proveedor = proveedores.find(prov => prov.id === p.proveedorId)
    return {
      ...p,
      proveedorNombre: proveedor?.nombre || 'Desconocido'
    }
  })
  
  res.json(resultado)
})

// GET /api/compras/historial/:articuloId - Historial de precios
router.get('/historial/:articuloId', (req, res) => {
  const articuloId = parseInt(req.params.articuloId)
  const { proveedorId } = req.query
  
  const historial = obtenerHistorialPrecios(
    articuloId, 
    proveedorId ? parseInt(proveedorId) : null
  )
  
  // Enriquecer con nombres de proveedores
  const resultado = historial.map(h => {
    const proveedor = proveedores.find(prov => prov.id === h.proveedorId)
    return {
      ...h,
      proveedorNombre: proveedor?.nombre || 'Desconocido'
    }
  })
  
  res.json(resultado)
})

// GET /api/compras/:id - Obtener una compra
router.get('/:id', (req, res) => {
  const compra = obtenerCompra(parseInt(req.params.id))
  
  if (!compra) {
    return res.status(404).json({ error: 'Compra no encontrada' })
  }
  
  res.json(compra)
})

// POST /api/compras - Crear compra
router.post('/', (req, res) => {
  const { proveedorId, items, fecha, notas } = req.body
  
  if (!proveedorId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Proveedor y al menos un artículo son requeridos' })
  }
  
  // Obtener nombre del proveedor
  const proveedor = proveedores.find(p => p.id === proveedorId)
  if (!proveedor) {
    return res.status(400).json({ error: 'Proveedor no encontrado' })
  }
  
  const nuevaCompra = crearCompra({
    proveedorId,
    proveedorNombre: proveedor.nombre,
    items,
    fecha,
    notas
  })
  
  res.status(201).json(nuevaCompra)
})

// PUT /api/compras/:id - Actualizar compra
router.put('/:id', (req, res) => {
  const compra = actualizarCompra(parseInt(req.params.id), req.body)
  
  if (!compra) {
    return res.status(404).json({ error: 'Compra no encontrada' })
  }
  
  res.json(compra)
})

export default router

