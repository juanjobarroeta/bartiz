import express from 'express'
import { movimientos } from '../data/contabilidad.js'

const router = express.Router()

router.get('/', (req, res) => {
  res.json(movimientos)
})

router.get('/:id', (req, res) => {
  const movimiento = movimientos.find(m => m.id === parseInt(req.params.id))
  if (movimiento) {
    res.json(movimiento)
  } else {
    res.status(404).json({ mensaje: 'Movimiento no encontrado' })
  }
})

router.post('/', (req, res) => {
  const nuevoMovimiento = {
    id: movimientos.length + 1,
    ...req.body
  }
  movimientos.push(nuevoMovimiento)
  res.status(201).json(nuevoMovimiento)
})

router.put('/:id', (req, res) => {
  const index = movimientos.findIndex(m => m.id === parseInt(req.params.id))
  if (index !== -1) {
    movimientos[index] = { ...movimientos[index], ...req.body }
    res.json(movimientos[index])
  } else {
    res.status(404).json({ mensaje: 'Movimiento no encontrado' })
  }
})

router.delete('/:id', (req, res) => {
  const index = movimientos.findIndex(m => m.id === parseInt(req.params.id))
  if (index !== -1) {
    movimientos.splice(index, 1)
    res.json({ mensaje: 'Movimiento eliminado' })
  } else {
    res.status(404).json({ mensaje: 'Movimiento no encontrado' })
  }
})

export default router




