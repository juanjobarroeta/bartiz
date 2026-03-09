import express from 'express'
import { solicitudes } from '../data/solicitudes.js'

const router = express.Router()

router.get('/', (req, res) => {
  res.json(solicitudes)
})

router.get('/:id', (req, res) => {
  const solicitud = solicitudes.find(s => s.id === parseInt(req.params.id))
  if (solicitud) {
    res.json(solicitud)
  } else {
    res.status(404).json({ mensaje: 'Solicitud no encontrada' })
  }
})

router.post('/', (req, res) => {
  const nuevaSolicitud = {
    id: solicitudes.length + 1,
    ...req.body
  }
  solicitudes.push(nuevaSolicitud)
  res.status(201).json(nuevaSolicitud)
})

router.put('/:id', (req, res) => {
  const index = solicitudes.findIndex(s => s.id === parseInt(req.params.id))
  if (index !== -1) {
    solicitudes[index] = { ...solicitudes[index], ...req.body }
    res.json(solicitudes[index])
  } else {
    res.status(404).json({ mensaje: 'Solicitud no encontrada' })
  }
})

router.delete('/:id', (req, res) => {
  const index = solicitudes.findIndex(s => s.id === parseInt(req.params.id))
  if (index !== -1) {
    solicitudes.splice(index, 1)
    res.json({ mensaje: 'Solicitud eliminada' })
  } else {
    res.status(404).json({ mensaje: 'Solicitud no encontrada' })
  }
})

export default router




