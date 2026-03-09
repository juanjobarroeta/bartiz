import express from 'express'
import { pagos } from '../data/pagos.js'

const router = express.Router()

router.get('/', (req, res) => {
  res.json(pagos)
})

router.get('/:id', (req, res) => {
  const pago = pagos.find(p => p.id === parseInt(req.params.id))
  if (pago) {
    res.json(pago)
  } else {
    res.status(404).json({ mensaje: 'Pago no encontrado' })
  }
})

router.post('/', (req, res) => {
  const nuevoPago = {
    id: pagos.length + 1,
    ...req.body
  }
  pagos.push(nuevoPago)
  res.status(201).json(nuevoPago)
})

router.put('/:id', (req, res) => {
  const index = pagos.findIndex(p => p.id === parseInt(req.params.id))
  if (index !== -1) {
    pagos[index] = { ...pagos[index], ...req.body }
    res.json(pagos[index])
  } else {
    res.status(404).json({ mensaje: 'Pago no encontrado' })
  }
})

router.delete('/:id', (req, res) => {
  const index = pagos.findIndex(p => p.id === parseInt(req.params.id))
  if (index !== -1) {
    pagos.splice(index, 1)
    res.json({ mensaje: 'Pago eliminado' })
  } else {
    res.status(404).json({ mensaje: 'Pago no encontrado' })
  }
})

export default router




