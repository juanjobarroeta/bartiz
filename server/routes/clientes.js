import express from 'express'
import clientes from '../data/clientes.js'

const router = express.Router()

router.get('/', (req, res) => {
  res.json(clientes)
})

router.get('/:id', (req, res) => {
  const cliente = clientes.find(c => c.id === parseInt(req.params.id))
  if (cliente) {
    res.json(cliente)
  } else {
    res.status(404).json({ mensaje: 'Cliente no encontrado' })
  }
})

router.post('/', (req, res) => {
  const nuevoCliente = {
    id: clientes.length + 1,
    ...req.body
  }
  clientes.push(nuevoCliente)
  res.status(201).json(nuevoCliente)
})

router.put('/:id', (req, res) => {
  const index = clientes.findIndex(c => c.id === parseInt(req.params.id))
  if (index !== -1) {
    clientes[index] = { ...clientes[index], ...req.body }
    res.json(clientes[index])
  } else {
    res.status(404).json({ mensaje: 'Cliente no encontrado' })
  }
})

router.delete('/:id', (req, res) => {
  const index = clientes.findIndex(c => c.id === parseInt(req.params.id))
  if (index !== -1) {
    clientes.splice(index, 1)
    res.json({ mensaje: 'Cliente eliminado' })
  } else {
    res.status(404).json({ mensaje: 'Cliente no encontrado' })
  }
})

export default router


