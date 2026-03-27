import express from 'express'
import proveedores from '../data/proveedores.js'

const router = express.Router()

router.get('/', (req, res) => {
  res.json(proveedores)
})

router.get('/:id', (req, res) => {
  const proveedor = proveedores.find(p => p.id === parseInt(req.params.id))
  if (proveedor) {
    res.json(proveedor)
  } else {
    res.status(404).json({ mensaje: 'Proveedor no encontrado' })
  }
})

router.post('/', (req, res) => {
  const nuevoProveedor = {
    id: proveedores.length + 1,
    ...req.body
  }
  proveedores.push(nuevoProveedor)
  res.status(201).json(nuevoProveedor)
})

router.put('/:id', (req, res) => {
  const index = proveedores.findIndex(p => p.id === parseInt(req.params.id))
  if (index !== -1) {
    proveedores[index] = { ...proveedores[index], ...req.body }
    res.json(proveedores[index])
  } else {
    res.status(404).json({ mensaje: 'Proveedor no encontrado' })
  }
})

router.delete('/:id', (req, res) => {
  const index = proveedores.findIndex(p => p.id === parseInt(req.params.id))
  if (index !== -1) {
    proveedores.splice(index, 1)
    res.json({ mensaje: 'Proveedor eliminado' })
  } else {
    res.status(404).json({ mensaje: 'Proveedor no encontrado' })
  }
})

export default router




