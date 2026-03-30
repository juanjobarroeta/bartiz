import { Router } from 'express'
import * as cotizacionesService from '../services/cotizaciones.js'
import { generateBudgetQuotePDF } from '../services/pdf-generator.js'
import * as proyectosService from '../services/proyectos.js'

const router = Router()

// GET /api/cotizaciones - Listar cotizaciones
router.get('/', async (req, res) => {
  try {
    const { proyectoId } = req.query
    const cotizaciones = await cotizacionesService.obtenerCotizaciones(
      proyectoId ? parseInt(proyectoId) : null
    )
    res.json(cotizaciones)
  } catch (error) {
    console.error('Error getting quotes:', error)
    res.status(500).json({ error: 'Error al obtener cotizaciones' })
  }
})

// GET /api/cotizaciones/:id - Obtener cotización con items
router.get('/:id', async (req, res) => {
  try {
    const cotizacion = await cotizacionesService.obtenerCotizacion(parseInt(req.params.id))
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' })
    }
    res.json(cotizacion)
  } catch (error) {
    console.error('Error getting quote:', error)
    res.status(500).json({ error: 'Error al obtener cotización' })
  }
})

// POST /api/cotizaciones/desde-presupuesto - Crear cotización desde presupuesto
router.post('/desde-presupuesto', async (req, res) => {
  try {
    const cotizacion = await cotizacionesService.crearCotizacionDesdePresupuesto(req.body)
    res.status(201).json(cotizacion)
  } catch (error) {
    console.error('Error creating quote:', error)
    res.status(500).json({ error: error.message || 'Error al crear cotización' })
  }
})

// PUT /api/cotizaciones/:id - Actualizar cotización
router.put('/:id', async (req, res) => {
  try {
    const cotizacion = await cotizacionesService.actualizarCotizacion(parseInt(req.params.id), req.body)
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' })
    }
    res.json(cotizacion)
  } catch (error) {
    console.error('Error updating quote:', error)
    res.status(500).json({ error: 'Error al actualizar cotización' })
  }
})

// DELETE /api/cotizaciones/:id - Eliminar cotización
router.delete('/:id', async (req, res) => {
  try {
    await cotizacionesService.eliminarCotizacion(parseInt(req.params.id))
    res.json({ mensaje: 'Cotización eliminada' })
  } catch (error) {
    console.error('Error deleting quote:', error)
    res.status(500).json({ error: 'Error al eliminar cotización' })
  }
})

// GET /api/cotizaciones/:id/pdf - Generar PDF de cotización
router.get('/:id/pdf', async (req, res) => {
  try {
    const cotizacion = await cotizacionesService.obtenerCotizacion(parseInt(req.params.id))
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' })
    }
    
    const proyecto = await proyectosService.obtenerProyecto(cotizacion.proyectoId)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Cotizacion-${cotizacion.nombreCotizacion.replace(/\s+/g, '-')}.pdf"`)
    
    // Convert cotizacion format to presupuesto format for PDF generator
    const presupuestoParaPDF = {
      proyectoNombre: proyecto?.nombre || cotizacion.nombreCotizacion,
      fases: agruparItemsPorFase(cotizacion.items),
      resumen: cotizacion.resumen
    }
    
    generateBudgetQuotePDF(presupuestoParaPDF, proyecto || {}, res, cotizacion.incluirIva)
  } catch (error) {
    console.error('Error generating quote PDF:', error)
    res.status(500).json({ error: 'Error al generar PDF' })
  }
})

function agruparItemsPorFase(items) {
  const fasesMap = {}
  
  items.forEach(item => {
    const faseNombre = item.faseNombre || 'Varios'
    if (!fasesMap[faseNombre]) {
      fasesMap[faseNombre] = {
        nombre: faseNombre,
        items: []
      }
    }
    
    fasesMap[faseNombre].items.push({
      articuloNombre: item.articuloNombre,
      articuloCodigo: item.articuloCodigo,
      unidad: item.unidad,
      cantidadPresupuestada: item.cantidad,
      precioUnitarioEstimado: item.precioVentaUnitario,
      subtotalEstimado: item.subtotalVenta
    })
  })
  
  return Object.values(fasesMap)
}

export default router
