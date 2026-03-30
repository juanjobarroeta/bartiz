import { Router } from 'express'
import * as presupuestosService from '../services/presupuestos-proyecto.js'
import * as proyectosService from '../services/proyectos.js'
import { fases } from '../data/presupuestos-proyecto.js'
import { generateBudgetQuotePDF } from '../services/pdf-generator.js'

const router = Router()

// GET /api/presupuestos-proyecto/fases - Lista de fases disponibles
router.get('/fases', (req, res) => {
  res.json(fases)
})

// GET /api/presupuestos-proyecto - Listar presupuestos
router.get('/', async (req, res) => {
  try {
    const presupuestos = await presupuestosService.obtenerPresupuestos()
    res.json(presupuestos)
  } catch (error) {
    console.error('Error getting budgets:', error)
    res.status(500).json({ error: 'Error al obtener presupuestos' })
  }
})

// GET /api/presupuestos-proyecto/proyecto/:proyectoId - Obtener presupuesto por proyecto
router.get('/proyecto/:proyectoId', async (req, res) => {
  try {
    const presupuesto = await presupuestosService.obtenerPresupuestoPorProyecto(parseInt(req.params.proyectoId))
    if (!presupuesto) {
      return res.status(404).json({ error: 'No hay presupuesto para este proyecto' })
    }
    res.json(presupuesto)
  } catch (error) {
    console.error('Error getting budget by project:', error)
    res.status(500).json({ error: 'Error al obtener presupuesto' })
  }
})

// GET /api/presupuestos-proyecto/:id/pendientes - Items pendientes de solicitar
router.get('/:id/pendientes', (req, res) => {
  const { faseId } = req.query
  const items = obtenerItemsPendientes(parseInt(req.params.id), faseId || null)
  res.json(items)
})

// GET /api/presupuestos-proyecto/:id - Obtener presupuesto
router.get('/:id', async (req, res) => {
  try {
    const presupuesto = await presupuestosService.obtenerPresupuesto(parseInt(req.params.id))
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' })
    }
    res.json(presupuesto)
  } catch (error) {
    console.error('Error getting budget:', error)
    res.status(500).json({ error: 'Error al obtener presupuesto' })
  }
})

// POST /api/presupuestos-proyecto - Crear presupuesto
router.post('/', async (req, res) => {
  try {
    const { proyectoId, proyectoNombre, fases } = req.body
    
    if (!proyectoId || !proyectoNombre) {
      return res.status(400).json({ error: 'Proyecto es requerido' })
    }
    
    // Verificar que no exista presupuesto para el proyecto
    const existente = await presupuestosService.obtenerPresupuestoPorProyecto(proyectoId)
    if (existente) {
      return res.status(400).json({ error: 'Ya existe un presupuesto para este proyecto' })
    }
    
    const nuevo = await presupuestosService.crearPresupuesto({ proyectoId, proyectoNombre, fases })
    res.status(201).json(nuevo)
  } catch (error) {
    console.error('Error creating budget:', error)
    res.status(500).json({ error: 'Error al crear presupuesto' })
  }
})

// PUT /api/presupuestos-proyecto/:id - Actualizar presupuesto
router.put('/:id', async (req, res) => {
  try {
    const presupuesto = await presupuestosService.actualizarPresupuesto(parseInt(req.params.id), req.body)
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' })
    }
    res.json(presupuesto)
  } catch (error) {
    console.error('Error updating budget:', error)
    res.status(500).json({ error: 'Error al actualizar presupuesto' })
  }
})

// POST /api/presupuestos-proyecto/:id/fase/:faseId/item - Agregar item a fase
router.post('/:id/fase/:faseId/item', async (req, res) => {
  try {
    const { articuloId, articuloCodigo, articuloNombre, unidad, cantidadPresupuestada, precioUnitarioEstimado } = req.body
    
    if (!articuloId || !cantidadPresupuestada) {
      return res.status(400).json({ error: 'Artículo y cantidad son requeridos' })
    }
    
    const resultado = await presupuestosService.agregarItemAFase(
      parseInt(req.params.id),
      req.params.faseId,
      { articuloId, articuloCodigo, articuloNombre, unidad, cantidadPresupuestada, precioUnitarioEstimado }
    )
    
    if (!resultado) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' })
    }
    
    if (resultado.error) {
      return res.status(400).json({ error: resultado.error })
    }
    
    res.status(201).json(resultado)
  } catch (error) {
    console.error('Error adding item:', error)
    res.status(500).json({ error: 'Error al agregar item' })
  }
})

// PUT /api/presupuestos-proyecto/:id/fase/:faseId/item/:itemId - Actualizar item
router.put('/:id/fase/:faseId/item/:itemId', async (req, res) => {
  try {
    const item = await presupuestosService.actualizarItemPresupuesto(
      parseInt(req.params.id),
      req.params.faseId,
      parseInt(req.params.itemId),
      req.body
    )
    
    if (!item) {
      return res.status(404).json({ error: 'Item no encontrado' })
    }
    
    res.json(item)
  } catch (error) {
    console.error('Error updating item:', error)
    res.status(500).json({ error: 'Error al actualizar item' })
  }
})

// DELETE /api/presupuestos-proyecto/:id/fase/:faseId/item/:itemId - Eliminar item
router.delete('/:id/fase/:faseId/item/:itemId', async (req, res) => {
  try {
    const eliminado = await presupuestosService.eliminarItemPresupuesto(
      parseInt(req.params.id),
      req.params.faseId,
      parseInt(req.params.itemId)
    )
    
    if (!eliminado) {
      return res.status(404).json({ error: 'Item no encontrado' })
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting item:', error)
    res.status(500).json({ error: 'Error al eliminar item' })
  }
})

// POST /api/presupuestos-proyecto/:id/generar-solicitud - Generar solicitud desde pendientes
router.post('/:id/generar-solicitud', async (req, res) => {
  try {
    const { faseId, proveedorId, proveedorNombre, itemIds } = req.body
    
    const presupuesto = await presupuestosService.obtenerPresupuesto(parseInt(req.params.id))
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' })
    }
    
    // Obtener items pendientes
    let pendientes = await presupuestosService.obtenerItemsPendientes(presupuesto.id, faseId || null)
    
    // Si se especificaron items, filtrar
    if (itemIds && itemIds.length > 0) {
      pendientes = pendientes.filter(p => itemIds.includes(p.id))
    }
    
    if (pendientes.length === 0) {
      return res.status(400).json({ error: 'No hay items pendientes de solicitar' })
    }
    
    // Crear estructura para solicitud
    const solicitudData = {
      proyectoId: presupuesto.proyectoId,
      proyectoNombre: presupuesto.proyectoNombre,
      fase: faseId || pendientes[0].faseId,
      proveedorId,
      proveedorNombre,
      items: pendientes.map(item => ({
        articuloId: item.articuloId,
        articuloCodigo: item.articuloCodigo,
        articuloNombre: item.articuloNombre,
        unidad: item.unidad,
        cantidad: item.cantidadPendiente,
        precioEstimado: item.precioUnitarioEstimado,
        enPresupuesto: true,
        cantidadPresupuestada: item.cantidadPresupuestada
      })),
      fromBudget: true,
      presupuestoId: presupuesto.id
    }
    
    res.json(solicitudData)
  } catch (error) {
    console.error('Error generating solicitud:', error)
    res.status(500).json({ error: 'Error al generar solicitud' })
  }
})

// GET /api/presupuestos-proyecto/:id/pdf - Generate PDF quote
router.get('/:id/pdf', async (req, res) => {
  try {
    const presupuesto = await presupuestosService.obtenerPresupuesto(parseInt(req.params.id))
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' })
    }
    
    const proyecto = await proyectosService.obtenerProyecto(presupuesto.proyectoId)
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Cotizacion-${presupuesto.proyectoNombre.replace(/\s+/g, '-')}.pdf"`)
    
    // Generate PDF
    generateBudgetQuotePDF(presupuesto, proyecto || {}, res)
  } catch (error) {
    console.error('Error generating PDF:', error)
    res.status(500).json({ error: 'Error al generar PDF' })
  }
})

export default router

