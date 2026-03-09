import express from 'express'
import { proyectos } from '../data/proyectos.js'

const router = express.Router()

// GET todos los proyectos
router.get('/', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : proyectos.length
  res.json(proyectos.slice(0, limit))
})

// GET proyecto por ID
router.get('/:id', (req, res) => {
  const proyecto = proyectos.find(p => p.id === parseInt(req.params.id))
  if (proyecto) {
    res.json(proyecto)
  } else {
    res.status(404).json({ mensaje: 'Proyecto no encontrado' })
  }
})

// POST crear proyecto
router.post('/', (req, res) => {
  const nuevoProyecto = {
    id: proyectos.length + 1,
    ...req.body
  }
  proyectos.push(nuevoProyecto)
  res.status(201).json(nuevoProyecto)
})

// PUT actualizar proyecto
router.put('/:id', (req, res) => {
  const index = proyectos.findIndex(p => p.id === parseInt(req.params.id))
  if (index !== -1) {
    proyectos[index] = { ...proyectos[index], ...req.body }
    res.json(proyectos[index])
  } else {
    res.status(404).json({ mensaje: 'Proyecto no encontrado' })
  }
})

// DELETE eliminar proyecto
router.delete('/:id', (req, res) => {
  const index = proyectos.findIndex(p => p.id === parseInt(req.params.id))
  if (index !== -1) {
    proyectos.splice(index, 1)
    res.json({ mensaje: 'Proyecto eliminado' })
  } else {
    res.status(404).json({ mensaje: 'Proyecto no encontrado' })
  }
})

export default router


