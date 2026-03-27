import express from 'express'
import inventario from '../data/inventario.js'

const router = express.Router()

router.get('/', (req, res) => {
  res.json(inventario)
})

router.get('/:id', (req, res) => {
  const item = inventario.find(i => i.id === parseInt(req.params.id))
  if (item) {
    res.json(item)
  } else {
    res.status(404).json({ mensaje: 'Item no encontrado' })
  }
})

router.post('/', (req, res) => {
  const nuevoItem = {
    id: inventario.length + 1,
    ...req.body
  }
  inventario.push(nuevoItem)
  res.status(201).json(nuevoItem)
})

router.put('/:id', (req, res) => {
  const index = inventario.findIndex(i => i.id === parseInt(req.params.id))
  if (index !== -1) {
    inventario[index] = { ...inventario[index], ...req.body }
    res.json(inventario[index])
  } else {
    res.status(404).json({ mensaje: 'Item no encontrado' })
  }
})

router.delete('/:id', (req, res) => {
  const index = inventario.findIndex(i => i.id === parseInt(req.params.id))
  if (index !== -1) {
    inventario.splice(index, 1)
    res.json({ mensaje: 'Item eliminado' })
  } else {
    res.status(404).json({ mensaje: 'Item no encontrado' })
  }
})

export default router


