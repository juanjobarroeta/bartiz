import express from 'express'
import { empleados } from '../data/empleados.js'

const router = express.Router()

router.get('/', (req, res) => {
  res.json(empleados)
})

router.get('/:id', (req, res) => {
  const empleado = empleados.find(e => e.id === parseInt(req.params.id))
  if (empleado) {
    res.json(empleado)
  } else {
    res.status(404).json({ mensaje: 'Empleado no encontrado' })
  }
})

router.post('/', (req, res) => {
  const nuevoEmpleado = {
    id: empleados.length + 1,
    ...req.body
  }
  empleados.push(nuevoEmpleado)
  res.status(201).json(nuevoEmpleado)
})

router.put('/:id', (req, res) => {
  const index = empleados.findIndex(e => e.id === parseInt(req.params.id))
  if (index !== -1) {
    empleados[index] = { ...empleados[index], ...req.body }
    res.json(empleados[index])
  } else {
    res.status(404).json({ mensaje: 'Empleado no encontrado' })
  }
})

router.delete('/:id', (req, res) => {
  const index = empleados.findIndex(e => e.id === parseInt(req.params.id))
  if (index !== -1) {
    empleados.splice(index, 1)
    res.json({ mensaje: 'Empleado eliminado' })
  } else {
    res.status(404).json({ mensaje: 'Empleado no encontrado' })
  }
})

export default router


