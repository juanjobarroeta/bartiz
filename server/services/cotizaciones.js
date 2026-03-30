import { query } from '../db/config.js'
import { obtenerPresupuesto } from './presupuestos-proyecto.js'

export const obtenerCotizaciones = async (proyectoId = null) => {
  const sql = proyectoId
    ? 'SELECT * FROM cotizaciones WHERE proyecto_id = $1 ORDER BY created_at DESC'
    : 'SELECT * FROM cotizaciones ORDER BY created_at DESC'
  
  const params = proyectoId ? [proyectoId] : []
  const result = await query(sql, params)
  return result.rows.map(mapCotizacion)
}

export const obtenerCotizacion = async (id) => {
  const result = await query(`
    SELECT 
      c.*,
      json_agg(
        json_build_object(
          'id', ic.id,
          'articuloNombre', ic.articulo_nombre,
          'articuloCodigo', ic.articulo_codigo,
          'unidad', ic.unidad,
          'cantidad', ic.cantidad,
          'costoUnitario', ic.costo_unitario,
          'precioVentaUnitario', ic.precio_venta_unitario,
          'margenItem', ic.margen_item,
          'margenPorcentaje', ic.margen_porcentaje,
          'subtotalCosto', ic.subtotal_costo,
          'subtotalVenta', ic.subtotal_venta,
          'faseNombre', ic.fase_nombre
        )
      ) FILTER (WHERE ic.id IS NOT NULL) as items
    FROM cotizaciones c
    LEFT JOIN items_cotizacion ic ON ic.cotizacion_id = c.id
    WHERE c.id = $1
    GROUP BY c.id
  `, [id])
  
  return result.rows[0] ? mapCotizacionConItems(result.rows[0]) : null
}

export const crearCotizacionDesdePresupuesto = async (datos) => {
  const { presupuestoId, nombreCotizacion, clienteNombre, tipoCliente, margenGlobal, incluirIva, notas } = datos
  
  // Get budget with all items
  const presupuesto = await obtenerPresupuesto(presupuestoId)
  if (!presupuesto) {
    throw new Error('Presupuesto no encontrado')
  }
  
  // Create quote
  const cotizacionResult = await query(`
    INSERT INTO cotizaciones 
    (proyecto_id, presupuesto_id, nombre_cotizacion, cliente_nombre, tipo_cliente, margen_global, incluir_iva, notas)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    presupuesto.proyectoId,
    presupuestoId,
    nombreCotizacion,
    clienteNombre,
    tipoCliente || 'privado',
    margenGlobal || 20,
    incluirIva !== false,
    notas || null
  ])
  
  const cotizacion = cotizacionResult.rows[0]
  const margen = parseFloat(margenGlobal || 20) / 100
  
  // Copy items from budget and apply markup
  for (const fase of presupuesto.fases || []) {
    for (const item of fase.items || []) {
      const cantidad = parseFloat(item.cantidadPresupuestada) || 0
      const costoUnitario = parseFloat(item.costoUnitario) || 0
      
      // Calculate selling price with markup
      const precioVentaUnitario = costoUnitario / (1 - margen)
      const margenItem = precioVentaUnitario - costoUnitario
      const margenPorcentaje = precioVentaUnitario > 0 ? (margenItem / precioVentaUnitario) * 100 : 0
      const subtotalCosto = cantidad * costoUnitario
      const subtotalVenta = cantidad * precioVentaUnitario
      
      await query(`
        INSERT INTO items_cotizacion
        (cotizacion_id, item_presupuesto_id, articulo_nombre, articulo_codigo, unidad,
         cantidad, costo_unitario, precio_venta_unitario, margen_item, margen_porcentaje,
         subtotal_costo, subtotal_venta, fase_nombre)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        cotizacion.id,
        item.id,
        item.articuloNombre,
        item.articuloCodigo,
        item.unidad,
        cantidad,
        costoUnitario,
        precioVentaUnitario,
        margenItem,
        margenPorcentaje,
        subtotalCosto,
        subtotalVenta,
        fase.nombre
      ])
    }
  }
  
  return obtenerCotizacion(cotizacion.id)
}

export const actualizarCotizacion = async (id, datos) => {
  const fields = []
  const values = []
  let paramCount = 1

  if (datos.nombreCotizacion !== undefined) {
    fields.push(`nombre_cotizacion = $${paramCount++}`)
    values.push(datos.nombreCotizacion)
  }
  if (datos.clienteNombre !== undefined) {
    fields.push(`cliente_nombre = $${paramCount++}`)
    values.push(datos.clienteNombre)
  }
  if (datos.tipoCliente !== undefined) {
    fields.push(`tipo_cliente = $${paramCount++}`)
    values.push(datos.tipoCliente)
  }
  if (datos.margenGlobal !== undefined) {
    fields.push(`margen_global = $${paramCount++}`)
    values.push(datos.margenGlobal)
  }
  if (datos.estado !== undefined) {
    fields.push(`estado = $${paramCount++}`)
    values.push(datos.estado)
  }

  if (fields.length === 0) return obtenerCotizacion(id)

  fields.push(`updated_at = CURRENT_TIMESTAMP`)
  values.push(id)

  await query(
    `UPDATE cotizaciones SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  )
  
  return obtenerCotizacion(id)
}

export const eliminarCotizacion = async (id) => {
  await query('DELETE FROM cotizaciones WHERE id = $1', [id])
  return true
}

function mapCotizacion(row) {
  return {
    id: row.id,
    proyectoId: row.proyecto_id,
    presupuestoId: row.presupuesto_id,
    nombreCotizacion: row.nombre_cotizacion,
    clienteNombre: row.cliente_nombre,
    tipoCliente: row.tipo_cliente,
    margenGlobal: parseFloat(row.margen_global),
    estado: row.estado,
    validezDias: row.validez_dias,
    incluirIva: row.incluir_iva,
    notas: row.notas,
    fechaCreacion: row.fecha_creacion,
    fechaVencimiento: row.fecha_vencimiento
  }
}

function mapCotizacionConItems(row) {
  const items = row.items || []
  
  const totalCosto = items.reduce((sum, i) => sum + parseFloat(i.subtotalCosto || 0), 0)
  const totalVenta = items.reduce((sum, i) => sum + parseFloat(i.subtotalVenta || 0), 0)
  const utilidad = totalVenta - totalCosto
  const margenPorcentaje = totalVenta > 0 ? (utilidad / totalVenta) * 100 : 0
  
  return {
    ...mapCotizacion(row),
    items: items,
    resumen: {
      totalCosto,
      totalVenta,
      utilidad,
      margenPorcentaje,
      iva: row.incluir_iva ? totalVenta * 0.16 : 0,
      totalConIva: row.incluir_iva ? totalVenta * 1.16 : totalVenta
    }
  }
}
