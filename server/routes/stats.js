import express from 'express'
import * as proyectosService from '../services/proyectos.js'
import clientes from '../data/clientes.js'
import empleados from '../data/empleados.js'
import presupuestos from '../data/presupuestos.js'
import solicitudes from '../data/solicitudes.js'
import pagos from '../data/pagos.js'
import movimientos from '../data/contabilidad.js'
import proveedores from '../data/proveedores.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const proyectos = await proyectosService.obtenerProyectos()
    const proyectosActivos = proyectos.filter(p => 
      ['Cotización', 'Proceso de Licitación', 'Planeación', 'En Progreso'].includes(p.estado)
    ).length
  
  const clientesActivos = clientes.length
  
  const totalEmpleados = empleados.length
  
  const presupuestoTotal = presupuestos.reduce((acc, p) => 
    acc + p.presupuestoTotal, 0
  )

  // Estadísticas de solicitudes
  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pendiente').length

  // Estadísticas de pagos
  const pagosPendientes = pagos.filter(p => p.estado === 'pendiente').length
  const totalPagado = pagos.filter(p => p.estado === 'pagado').reduce((sum, p) => sum + p.monto, 0)

  // Estadísticas de contabilidad
  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0)
  const balance = totalIngresos - totalEgresos

  // Estadísticas de proveedores
  const totalProveedores = proveedores.length
  const proveedoresActivos = proveedores.filter(p => p.activo).length
  const saldoProveedores = proveedores.reduce((sum, p) => sum + (p.saldoPendiente || 0), 0)

    res.json({
      proyectosActivos,
      clientesActivos,
      empleados: totalEmpleados,
      presupuestoTotal,
      solicitudesPendientes,
      pagosPendientes,
      totalPagado,
      totalIngresos,
      totalEgresos,
      balance,
      totalProveedores,
      proveedoresActivos,
      saldoProveedores,
      totalGastado: totalPagado,
      progresoPromedio: proyectosActivos > 0 ? Math.round(proyectos.reduce((sum, p) => sum + (p.progreso || 0), 0) / proyectos.length) : 0,
      proyectosCompletados: proyectos.filter(p => p.estado === 'Completado').length
    })
  } catch (error) {
    console.error('Error getting stats:', error)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

export default router


