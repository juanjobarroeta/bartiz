import express from 'express'
import presupuestos from '../data/presupuestos.js'

const router = express.Router()

router.get('/', (req, res) => {
  res.json(presupuestos)
})

router.get('/:id', (req, res) => {
  const presupuesto = presupuestos.find(p => p.id === parseInt(req.params.id))
  if (presupuesto) {
    res.json(presupuesto)
  } else {
    res.status(404).json({ mensaje: 'Presupuesto no encontrado' })
  }
})

router.post('/', (req, res) => {
  const nuevoPresupuesto = {
    id: presupuestos.length + 1,
    ...req.body
  }
  presupuestos.push(nuevoPresupuesto)
  res.status(201).json(nuevoPresupuesto)
})

router.put('/:id', (req, res) => {
  const index = presupuestos.findIndex(p => p.id === parseInt(req.params.id))
  if (index !== -1) {
    presupuestos[index] = { ...presupuestos[index], ...req.body }
    res.json(presupuestos[index])
  } else {
    res.status(404).json({ mensaje: 'Presupuesto no encontrado' })
  }
})

router.delete('/:id', (req, res) => {
  const index = presupuestos.findIndex(p => p.id === parseInt(req.params.id))
  if (index !== -1) {
    presupuestos.splice(index, 1)
    res.json({ mensaje: 'Presupuesto eliminado' })
  } else {
    res.status(404).json({ mensaje: 'Presupuesto no encontrado' })
  }
})

export default router


