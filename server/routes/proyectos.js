import express from 'express'
import * as proyectosService from '../services/proyectos.js'

const router = express.Router()

// GET todos los proyectos
router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null
    const proyectos = await proyectosService.obtenerProyectos(limit)
    res.json(proyectos)
  } catch (error) {
    console.error('Error getting projects:', error)
    res.status(500).json({ error: 'Error al obtener proyectos' })
  }
})

// GET proyecto por ID
router.get('/:id', async (req, res) => {
  try {
    const proyecto = await proyectosService.obtenerProyecto(parseInt(req.params.id))
    if (proyecto) {
      res.json(proyecto)
    } else {
      res.status(404).json({ mensaje: 'Proyecto no encontrado' })
    }
  } catch (error) {
    console.error('Error getting project:', error)
    res.status(500).json({ error: 'Error al obtener proyecto' })
  }
})

// POST crear proyecto
router.post('/', async (req, res) => {
  try {
    const nuevoProyecto = await proyectosService.crearProyecto(req.body)
    res.status(201).json(nuevoProyecto)
  } catch (error) {
    console.error('Error creating project:', error)
    res.status(500).json({ error: 'Error al crear proyecto' })
  }
})

// PUT actualizar proyecto
router.put('/:id', async (req, res) => {
  try {
    const proyecto = await proyectosService.actualizarProyecto(parseInt(req.params.id), req.body)
    if (proyecto) {
      res.json(proyecto)
    } else {
      res.status(404).json({ mensaje: 'Proyecto no encontrado' })
    }
  } catch (error) {
    console.error('Error updating project:', error)
    res.status(500).json({ error: 'Error al actualizar proyecto' })
  }
})

// DELETE eliminar proyecto
router.delete('/:id', async (req, res) => {
  try {
    await proyectosService.eliminarProyecto(parseInt(req.params.id))
    res.json({ mensaje: 'Proyecto eliminado' })
  } catch (error) {
    console.error('Error deleting project:', error)
    res.status(500).json({ error: 'Error al eliminar proyecto' })
  }
})

export default router


