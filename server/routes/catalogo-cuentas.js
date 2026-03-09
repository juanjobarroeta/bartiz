import express from 'express'
import { catalogoCuentas, movimientosContables } from '../data/catalogo-cuentas.js'

const router = express.Router()

// Obtener catálogo completo
router.get('/', (req, res) => {
  res.json(catalogoCuentas)
})

// Obtener una cuenta específica
router.get('/:id', (req, res) => {
  const cuenta = catalogoCuentas.find(c => c.id === parseInt(req.params.id))
  if (cuenta) {
    res.json(cuenta)
  } else {
    res.status(404).json({ mensaje: 'Cuenta no encontrada' })
  }
})

// Obtener movimientos contables
router.get('/movimientos/all', (req, res) => {
  res.json(movimientosContables)
})

// Crear movimiento contable
router.post('/movimientos', (req, res) => {
  const nuevoMovimiento = {
    id: movimientosContables.length + 1,
    ...req.body,
    createdAt: new Date().toISOString()
  }
  movimientosContables.push(nuevoMovimiento)
  res.status(201).json(nuevoMovimiento)
})

export default router




